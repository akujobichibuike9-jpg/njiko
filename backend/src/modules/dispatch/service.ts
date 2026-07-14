import type { Db } from '../../core/db';

/* ────────────────────────────────────────────────────────────────
   DISPATCH ENGINE
   The engine decides who gets a job, when, and whether a rider may
   safely hold a second one. Riders never choose between offers.
   ──────────────────────────────────────────────────────────────── */

// ---- Tunable policy. Start conservative; tune from the event log later. ----
export const POLICY = {
  OFFER_TTL_SEC: 20,          // a rider has 20s to accept before it moves on
  MAX_DECLINES: 5,            // after 5 riders pass, escalate
  ESCALATE_AFTER_SEC: 90,     // ...or after 90s unassigned, whichever first
  FEE_BUMP: 200,              // ₦ added to delivery fee on each escalation
  MAX_JOBS_PER_RIDER: 2,      // stacking cap (1 = stacking off)
  MAX_DETOUR_MIN: 8,          // a 2nd job may not delay job #1 by more than this
  MAX_PICKUP_MIN: 20,         // don't offer jobs that are absurdly far (only when we know where they are)
  NO_GPS_PENALTY: 5,          // riders with no live position are still offered, just ranked behind those with GPS
  NO_MOVE_GRACE_SEC: 300,     // accepted but GPS silent this long -> take the job back
  UNASSIGN_ON_GPS_SILENCE: true,  // set false to never auto-unassign
  // cost weights
  A_PICKUP: 1.0,              // α  minutes to pickup
  B_DETOUR: 1.5,              // β  detour imposed on jobs already held
  C_RISK: 6.0,                // γ  unreliability penalty
  D_FAIRNESS: 2.0,            // δ  boost riders with fewer jobs today
  E_BATCH: 3.0,               // ε  reward stacks that genuinely co-route
};

export async function ensureTables(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL,
      rider_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'OFFERED',   -- OFFERED|ACCEPTED|DECLINED|EXPIRED
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS offers_live ON offers (order_id, status);
    CREATE INDEX IF NOT EXISTS offers_rider ON offers (rider_id, status);

    -- Every decision the engine makes. This is what lets us tune the weights later.
    CREATE TABLE IF NOT EXISTS dispatch_events (
      id bigserial PRIMARY KEY,
      order_id uuid,
      rider_id uuid,
      type text NOT NULL,        -- OFFERED|ACCEPTED|DECLINED|EXPIRED|GATE_REJECT|ESCALATED|UNASSIGNED|PREDICT|ACTUAL
      reason text,               -- why (esp. GATE_REJECT)
      meta jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS dispatch_events_order ON dispatch_events (order_id, created_at);

    -- Rider reliability + fairness counters.
    CREATE TABLE IF NOT EXISTS rider_stats (
      rider_id uuid PRIMARY KEY,
      accepts int NOT NULL DEFAULT 0,
      declines int NOT NULL DEFAULT 0,
      expires int NOT NULL DEFAULT 0,
      cancels int NOT NULL DEFAULT 0,
      late int NOT NULL DEFAULT 0,
      jobs_today int NOT NULL DEFAULT 0,
      day date NOT NULL DEFAULT current_date
    );

    -- Rolling prep-time estimate per store, per hour of day.
    CREATE TABLE IF NOT EXISTS merchant_prep (
      store_id uuid NOT NULL,
      hour int NOT NULL,
      avg_min numeric NOT NULL DEFAULT 12,
      samples int NOT NULL DEFAULT 0,
      PRIMARY KEY (store_id, hour)
    );
  `);
}

export async function logEvent(db: Db, e: { order_id?: string | null; rider_id?: string | null; type: string; reason?: string; meta?: unknown }) {
  await db.query(
    `INSERT INTO dispatch_events (order_id, rider_id, type, reason, meta) VALUES ($1,$2,$3,$4,$5)`,
    [e.order_id ?? null, e.rider_id ?? null, e.type, e.reason ?? null, e.meta ? JSON.stringify(e.meta) : null],
  );
}

/* ---------- geometry + time helpers ---------- */
const R = 6371;
function haversineKm(a: Pt, b: Pt) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Cheap city-driving estimate. Real road time comes from Geoapify only when it matters.
const AVG_KMH = 22;
export function minutesBetween(a: Pt, b: Pt) { return (haversineKm(a, b) / AVG_KMH) * 60; }

export interface Pt { lat: number; lng: number }
export interface Stop { kind: 'pickup' | 'dropoff'; order_id: string; at: Pt }

/* ---------- 1. RE-SEQUENCING ----------
   Given the stops a rider must make, find the cheapest order that never
   drops an order before it's been picked up. 2–3 jobs = 4–6 stops, so we
   simply try every permutation and throw away the invalid ones. */
export function bestSequence(from: Pt, stops: Stop[]): { seq: Stop[]; minutes: number } {
  const perms: Stop[][] = [];
  const permute = (arr: Stop[], cur: Stop[] = []) => {
    if (!arr.length) { perms.push(cur); return; }
    arr.forEach((s, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, s]));
  };
  permute(stops);

  let best: Stop[] | null = null;
  let bestMin = Infinity;
  for (const p of perms) {
    // precedence: a pickup must come before its own dropoff
    const seen = new Set<string>();
    let ok = true;
    for (const s of p) {
      if (s.kind === 'pickup') seen.add(s.order_id);
      else if (!seen.has(s.order_id)) { ok = false; break; }
    }
    if (!ok) continue;
    let mins = 0, cur = from;
    for (const s of p) { mins += minutesBetween(cur, s.at); cur = s.at; }
    if (mins < bestMin) { bestMin = mins; best = p; }
  }
  return { seq: best ?? stops, minutes: Math.round(bestMin === Infinity ? 0 : bestMin) };
}

/* ---------- 2. PREP TIME ----------
   Don't send a rider to stand around. Predict how long this store takes
   at this hour, and prefer riders who arrive as the food is ready. */
export async function predictPrepMin(db: Db, storeId: string): Promise<number> {
  const hour = new Date().getHours();
  const { rows } = await db.query(`SELECT avg_min FROM merchant_prep WHERE store_id=$1 AND hour=$2`, [storeId, hour]);
  return rows[0] ? Number(rows[0].avg_min) : 12;
}
export async function recordPrepActual(db: Db, storeId: string, minutes: number) {
  const hour = new Date().getHours();
  await db.query(
    `INSERT INTO merchant_prep (store_id, hour, avg_min, samples) VALUES ($1,$2,$3,1)
     ON CONFLICT (store_id, hour) DO UPDATE
       SET avg_min = (merchant_prep.avg_min * merchant_prep.samples + $3) / (merchant_prep.samples + 1),
           samples = merchant_prep.samples + 1`,
    [storeId, hour, minutes],
  );
}

/* ---------- 3. THE STACKING GATE ----------
   A rider may only be OFFERED a second job if every check passes.
   The rider never decides this — the engine does. */
export interface GateResult { ok: boolean; reason?: string; detourMin?: number; batchBonus?: number }

export function stackingGate(rider: Pt, held: Stop[], candidate: { pickup: Pt; dropoff: Pt; order_id: string }): GateResult {
  if (held.length === 0) return { ok: true, detourMin: 0, batchBonus: 0 };
  const heldOrders = new Set(held.map((s) => s.order_id));
  if (heldOrders.size >= POLICY.MAX_JOBS_PER_RIDER) return { ok: false, reason: 'AT_JOB_CAP' };

  const before = bestSequence(rider, held).minutes;
  const withNew = bestSequence(rider, [
    ...held,
    { kind: 'pickup', order_id: candidate.order_id, at: candidate.pickup },
    { kind: 'dropoff', order_id: candidate.order_id, at: candidate.dropoff },
  ]);
  // how much later do the EXISTING jobs finish because of this one?
  const soloNew = minutesBetween(rider, candidate.pickup) + minutesBetween(candidate.pickup, candidate.dropoff);
  const detour = withNew.minutes - before - soloNew;

  if (detour > POLICY.MAX_DETOUR_MIN) return { ok: false, reason: 'DETOUR_TOO_LONG', detourMin: Math.round(detour) };
  // a genuinely co-routed stack costs less than doing both separately
  const batchBonus = Math.max(0, (before + soloNew) - withNew.minutes);
  return { ok: true, detourMin: Math.round(Math.max(0, detour)), batchBonus: Math.round(batchBonus) };
}

/* ---------- 4. THE COST FUNCTION ----------
   Not "nearest rider" — cheapest overall, including fairness and risk. */
export interface RiderCand { rider_id: string; at: Pt; held: Stop[]; stats: any }

export function cost(c: RiderCand, job: { pickup: Pt; dropoff: Pt; order_id: string }, gate: GateResult, maxJobsToday: number) {
  const pickupMin = minutesBetween(c.at, job.pickup);
  const s = c.stats ?? {};
  const attempts = (s.accepts ?? 0) + (s.declines ?? 0) + (s.expires ?? 0);
  const unreliability = attempts > 3 ? ((s.declines ?? 0) + (s.expires ?? 0) + (s.cancels ?? 0) * 2 + (s.late ?? 0)) / attempts : 0;
  const fairness = maxJobsToday > 0 ? 1 - (s.jobs_today ?? 0) / maxJobsToday : 1; // fewer jobs today => bigger credit

  return (
    POLICY.A_PICKUP * pickupMin +
    POLICY.B_DETOUR * (gate.detourMin ?? 0) +
    POLICY.C_RISK * unreliability -
    POLICY.D_FAIRNESS * fairness -
    POLICY.E_BATCH * ((gate.batchBonus ?? 0) / 10)
  );
}

/* ---------- 5. THE OFFER PROTOCOL ----------
   One offer at a time, server-side expiry, guarded accept. */

// Ask the engine: who should be offered this job next?
export async function pickRider(db: Db, order: any, alreadyOffered: string[]) {
  // Every rider who isn't blocked is eligible — GPS or not. Riders with a known
  // position get scored on real distance; riders without one are still offerable,
  // just scored neutrally (we can't measure how far away they are).
  const { rows: riders } = await db.query(
    `SELECT a.id AS rider_id, rl.lat, rl.lng, rl.updated_at
       FROM accounts a
       LEFT JOIN rider_locations rl ON rl.rider_id = a.id
      WHERE a.role='rider' AND a.blocked = false`,
  );
  if (!riders.length) return null;

  const { rows: statRows } = await db.query(`SELECT * FROM rider_stats WHERE day = current_date`);
  const stats = new Map(statRows.map((r: any) => [r.rider_id, r]));
  const maxJobsToday = Math.max(1, ...statRows.map((r: any) => r.jobs_today ?? 0));

  const pickup: Pt = { lat: Number(order.store_lat), lng: Number(order.store_lng) };
  const dropoff: Pt = { lat: Number(order.dropoff_lat), lng: Number(order.dropoff_lng) };

  const candidates: { rider_id: string; c: number; gate: GateResult }[] = [];

  for (const r of riders) {
    if (alreadyOffered.includes(r.rider_id)) continue;

    // what is this rider already holding?
    const { rows: heldRows } = await db.query(
      `SELECT o.id, o.status, s.lat AS store_lat, s.lng AS store_lng, o.dropoff_lat, o.dropoff_lng
         FROM orders o JOIN merchant_stores s ON s.account_id = o.store_id
        WHERE o.rider_id = $1 AND o.status IN ('assigned','picked_up')`, [r.rider_id]);

    const held: Stop[] = [];
    for (const h of heldRows) {
      if (h.status === 'assigned' && h.store_lat != null) held.push({ kind: 'pickup', order_id: h.id, at: { lat: Number(h.store_lat), lng: Number(h.store_lng) } });
      if (h.dropoff_lat != null) held.push({ kind: 'dropoff', order_id: h.id, at: { lat: Number(h.dropoff_lat), lng: Number(h.dropoff_lng) } });
    }

    const known = r.lat != null && r.lng != null;
    // No GPS? Use the store as a stand-in so the maths still works, and don't
    // reject them for distance we cannot actually measure.
    const at: Pt = known ? { lat: Number(r.lat), lng: Number(r.lng) } : pickup;

    const gate = known
      ? stackingGate(at, held, { pickup, dropoff, order_id: order.id })
      : (new Set(held.map((h) => h.order_id)).size >= POLICY.MAX_JOBS_PER_RIDER
          ? { ok: false, reason: 'AT_JOB_CAP' } as GateResult
          : { ok: true, detourMin: 0, batchBonus: 0 } as GateResult);

    if (!gate.ok) {
      await logEvent(db, { order_id: order.id, rider_id: r.rider_id, type: 'GATE_REJECT', reason: gate.reason, meta: gate });
      continue;
    }
    if (known && minutesBetween(at, pickup) > POLICY.MAX_PICKUP_MIN) {
      await logEvent(db, { order_id: order.id, rider_id: r.rider_id, type: 'GATE_REJECT', reason: 'TOO_FAR' });
      continue;
    }

    let c = cost({ rider_id: r.rider_id, at, held, stats: stats.get(r.rider_id) }, { pickup, dropoff, order_id: order.id }, gate, maxJobsToday);
    // Riders with live GPS are genuinely preferable — nudge unknown-position riders
    // behind them rather than excluding them.
    if (!known) c += POLICY.NO_GPS_PENALTY;
    candidates.push({ rider_id: r.rider_id, c, gate });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.c - b.c);
  return candidates[0];
}

// Create the single live offer for an order.
export async function makeOffer(db: Db, order: any, riderId: string, meta: unknown) {
  const { rows } = await db.query(
    `INSERT INTO offers (order_id, rider_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' seconds')::interval) RETURNING *`,
    [order.id, riderId, String(POLICY.OFFER_TTL_SEC)],
  );
  await logEvent(db, { order_id: order.id, rider_id: riderId, type: 'OFFERED', meta });
  return rows[0];
}

/* GUARDED ACCEPT — the whole race condition lives here.
   Zero rows updated => the offer was already taken/expired. Never trust the client. */
/* GUARDED ACCEPT — the whole race condition lives here.
   The core Db exposes only query(), so instead of BEGIN/COMMIT we do the claim and the
   assignment in ONE statement using data-modifying CTEs. Postgres runs it atomically:
   the order is only assigned if the offer was still live AND the order still had no rider.
   Zero rows => somebody/something beat you. Never trust the client. */
export async function acceptOffer(db: Db, orderId: string, riderId: string) {
  const { rows } = await db.query<{ claimed: number; assigned: number }>(
    `WITH claim AS (
       UPDATE offers SET status='ACCEPTED'
        WHERE order_id=$1 AND rider_id=$2 AND status='OFFERED' AND expires_at > now()
        RETURNING order_id
     ), assign AS (
       UPDATE orders SET rider_id=$2, status='assigned'
        WHERE id=$1 AND rider_id IS NULL
          AND status IN ('accepted','preparing','ready')
          AND EXISTS (SELECT 1 FROM claim)
        RETURNING id
     )
     SELECT (SELECT count(*)::int FROM claim) AS claimed,
            (SELECT count(*)::int FROM assign) AS assigned`,
    [orderId, riderId],
  );

  const r = rows[0];
  if (!r || !r.claimed) return { ok: false, error: 'Offer expired' };
  if (!r.assigned) {
    // the offer was ours but the order had already gone — put the offer back to expired
    await db.query(`UPDATE offers SET status='EXPIRED' WHERE order_id=$1 AND rider_id=$2`, [orderId, riderId]);
    return { ok: false, error: 'Order already taken' };
  }

  await db.query(
    `INSERT INTO rider_stats (rider_id, accepts, jobs_today) VALUES ($1,1,1)
     ON CONFLICT (rider_id) DO UPDATE SET accepts = rider_stats.accepts + 1,
       jobs_today = CASE WHEN rider_stats.day = current_date THEN rider_stats.jobs_today + 1 ELSE 1 END,
       day = current_date`, [riderId]);
  await logEvent(db, { order_id: orderId, rider_id: riderId, type: 'ACCEPTED' });
  return { ok: true };
}

export async function declineOffer(db: Db, orderId: string, riderId: string) {
  await db.query(`UPDATE offers SET status='DECLINED' WHERE order_id=$1 AND rider_id=$2 AND status='OFFERED'`, [orderId, riderId]);
  await db.query(
    `INSERT INTO rider_stats (rider_id, declines) VALUES ($1,1)
     ON CONFLICT (rider_id) DO UPDATE SET declines = rider_stats.declines + 1`, [riderId]);
  await logEvent(db, { order_id: orderId, rider_id: riderId, type: 'DECLINED' });
}

/* ---------- 6. THE ENGINE TICK (runs server-side, not on a phone) ---------- */
export async function tick(db: Db, log: (m: string) => void) {
  // (a) expire stale offers
  const { rows: expired } = await db.query(
    `UPDATE offers SET status='EXPIRED'
      WHERE status='OFFERED' AND expires_at <= now() RETURNING order_id, rider_id`);
  for (const e of expired) {
    await db.query(`INSERT INTO rider_stats (rider_id, expires) VALUES ($1,1)
                    ON CONFLICT (rider_id) DO UPDATE SET expires = rider_stats.expires + 1`, [e.rider_id]);
    await logEvent(db, { order_id: e.order_id, rider_id: e.rider_id, type: 'EXPIRED' });
  }

  // (b) orders that need a rider and have no live offer
  const { rows: needy } = await db.query(
    `SELECT o.id, o.created_at, o.delivery_fee, o.store_id,
            s.lat AS store_lat, s.lng AS store_lng, o.dropoff_lat, o.dropoff_lng
       FROM orders o JOIN merchant_stores s ON s.account_id = o.store_id
      WHERE o.rider_id IS NULL
        AND o.status IN ('accepted','preparing','ready')
        AND NOT EXISTS (SELECT 1 FROM offers f WHERE f.order_id = o.id AND f.status='OFFERED' AND f.expires_at > now())`);

  for (const order of needy) {
    if (order.store_lat == null || order.dropoff_lat == null) continue;

    const { rows: past } = await db.query(
      `SELECT rider_id, status FROM offers WHERE order_id=$1`, [order.id]);
    const tried = past.map((p: any) => p.rider_id);
    const refusals = past.filter((p: any) => p.status === 'DECLINED' || p.status === 'EXPIRED').length;
    const ageSec = (Date.now() - new Date(order.created_at).getTime()) / 1000;

    // (c) escalate a job nobody wants: pay more, try everyone again, flag it for admin
    if (refusals >= POLICY.MAX_DECLINES || ageSec > POLICY.ESCALATE_AFTER_SEC) {
      await db.query(`UPDATE orders SET delivery_fee = COALESCE(delivery_fee,0) + $2 WHERE id=$1`, [order.id, POLICY.FEE_BUMP]);
      await db.query(`DELETE FROM offers WHERE order_id=$1 AND status IN ('DECLINED','EXPIRED')`, [order.id]);
      await logEvent(db, { order_id: order.id, type: 'ESCALATED', reason: refusals >= POLICY.MAX_DECLINES ? 'TOO_MANY_REFUSALS' : 'STALE', meta: { refusals, ageSec: Math.round(ageSec), feeBump: POLICY.FEE_BUMP } });
      continue; // next tick re-offers to everyone at the higher fee
    }

    const pick = await pickRider(db, order, tried);
    if (!pick) continue; // nobody eligible right now; try again next tick

    const prepMin = await predictPrepMin(db, order.store_id);
    await makeOffer(db, order, pick.rider_id, { cost: Number(pick.c.toFixed(2)), gate: pick.gate, prepMin });
    log(`offer -> order ${String(order.id).slice(0, 8)} to rider ${String(pick.rider_id).slice(0, 8)} (cost ${pick.c.toFixed(1)})`);
  }

  // (d) accepted but not moving: nudge, then unassign
  // Only claw back a job from a rider who HAD a position and then went dark.
  // A rider who never shared GPS at all is not evidence of gaming.
  const { rows: stalled } = POLICY.UNASSIGN_ON_GPS_SILENCE
    ? await db.query(
        `SELECT o.id, o.rider_id
           FROM orders o
           JOIN rider_locations rl ON rl.rider_id = o.rider_id
          WHERE o.status = 'assigned'
            AND rl.updated_at < now() - ($1 || ' seconds')::interval`,
        [String(POLICY.NO_MOVE_GRACE_SEC)])
    : { rows: [] as any[] };
  for (const s of stalled) {
    await db.query(`UPDATE orders SET rider_id = NULL, status='ready' WHERE id=$1`, [s.id]);
    await db.query(`INSERT INTO rider_stats (rider_id, cancels) VALUES ($1,1)
                    ON CONFLICT (rider_id) DO UPDATE SET cancels = rider_stats.cancels + 1`, [s.rider_id]);
    await logEvent(db, { order_id: s.id, rider_id: s.rider_id, type: 'UNASSIGNED', reason: 'NO_MOVEMENT' });
  }
}

// What the rider app polls: their single live offer (if any).
export async function currentOffer(db: Db, riderId: string) {
  const { rows } = await db.query(
    `SELECT f.order_id, f.expires_at,
            o.total, o.delivery_fee, o.delivery_address,
            s.name AS store_name, s.address AS store_address, s.lat AS store_lat, s.lng AS store_lng,
            o.dropoff_lat, o.dropoff_lng
       FROM offers f
       JOIN orders o ON o.id = f.order_id
       JOIN merchant_stores s ON s.account_id = o.store_id
      WHERE f.rider_id=$1 AND f.status='OFFERED' AND f.expires_at > now()
      ORDER BY f.created_at DESC LIMIT 1`, [riderId]);
  return rows[0] ?? null;
}

// The rider's full route across everything they hold, correctly sequenced.
export async function riderRoute(db: Db, riderId: string) {
  const { rows } = await db.query(
    `SELECT o.id, o.status, o.delivery_address, s.name AS store_name,
            s.lat AS store_lat, s.lng AS store_lng, o.dropoff_lat, o.dropoff_lng
       FROM orders o JOIN merchant_stores s ON s.account_id = o.store_id
      WHERE o.rider_id=$1 AND o.status IN ('assigned','picked_up')`, [riderId]);
  if (!rows.length) return { stops: [] };

  const { rows: loc } = await db.query(`SELECT lat, lng FROM rider_locations WHERE rider_id=$1`, [riderId]);
  if (!loc[0]) return { stops: [] };
  const from: Pt = { lat: Number(loc[0].lat), lng: Number(loc[0].lng) };

  const stops: Stop[] = [];
  const label = new Map<string, any>();
  for (const o of rows) {
    label.set(o.id, o);
    if (o.status === 'assigned' && o.store_lat != null) stops.push({ kind: 'pickup', order_id: o.id, at: { lat: Number(o.store_lat), lng: Number(o.store_lng) } });
    if (o.dropoff_lat != null) stops.push({ kind: 'dropoff', order_id: o.id, at: { lat: Number(o.dropoff_lat), lng: Number(o.dropoff_lng) } });
  }
  const { seq, minutes } = bestSequence(from, stops);
  return {
    total_min: minutes,
    stops: seq.map((s) => ({
      kind: s.kind,
      order_id: s.order_id,
      lat: s.at.lat,
      lng: s.at.lng,
      name: s.kind === 'pickup' ? label.get(s.order_id)?.store_name : 'Customer',
      address: s.kind === 'pickup' ? label.get(s.order_id)?.store_address : label.get(s.order_id)?.delivery_address,
    })),
  };
}

/* ────────────────────────────────────────────────────────────────
   7. PROOF OF DELIVERY — breadcrumb trail + completion check
   rider_locations only holds the LAST position, so a rider who ends a
   ride early leaves no evidence. We keep the full trail per order, and
   we record exactly where they stood when they pressed "Delivered".
   ──────────────────────────────────────────────────────────────── */

export async function ensureTraceTables(db: Db) {
  await db.query(`
    -- every GPS ping, kept per order: this is the rider's actual travelled path
    CREATE TABLE IF NOT EXISTS rider_traces (
      id bigserial PRIMARY KEY,
      order_id uuid NOT NULL,
      rider_id uuid NOT NULL,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS rider_traces_order ON rider_traces (order_id, at);

    -- where the rider actually was when they marked the order delivered
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_lat double precision;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_lng double precision;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_gap_m integer;   -- metres from the customer
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_flagged boolean DEFAULT false;
  `);
}

/* How far from the customer a "delivered" tap is still believable.
   This depends entirely on how good the customer's coordinates are:
   - 'pin'     → they dragged a pin onto their gate. Trustworthy. Tight radius.
   - 'profile' → saved location, possibly a geocoded street address, which in
                 Owerri can be hundreds of metres off. Flagging a rider on that
                 basis would accuse honest people, so we are far more forgiving. */
export const DELIVERY_RADIUS_M = 150;          // pinned drop-off
export const DELIVERY_RADIUS_LOOSE_M = 600;    // unverified / geocoded address
export function radiusFor(source?: string | null) {
  return source === 'pin' ? DELIVERY_RADIUS_M : DELIVERY_RADIUS_LOOSE_M;
}

// Append a breadcrumb for every active order this rider is carrying.
export async function traceRider(db: Db, riderId: string, lat: number, lng: number) {
  const { rows } = await db.query(
    `SELECT id FROM orders WHERE rider_id=$1 AND status IN ('assigned','picked_up')`, [riderId]);
  for (const o of rows) {
    await db.query(`INSERT INTO rider_traces (order_id, rider_id, lat, lng) VALUES ($1,$2,$3,$4)`,
      [o.id, riderId, lat, lng]);
  }
}

/* Called when a rider marks an order delivered.
   Records where they stood, how far that is from the customer, and flags it if
   they ended the ride somewhere they shouldn't have. */
export async function verifyDelivery(db: Db, orderId: string, riderId: string) {
  const { rows } = await db.query(
    `SELECT o.dropoff_lat, o.dropoff_lng, o.dropoff_source, rl.lat, rl.lng, rl.updated_at
       FROM orders o LEFT JOIN rider_locations rl ON rl.rider_id = $2
      WHERE o.id = $1`, [orderId, riderId]);
  const r = rows[0];
  if (!r || r.lat == null || r.dropoff_lat == null) return { gap_m: null, flagged: false };

  const gapKm = haversineKm(
    { lat: Number(r.lat), lng: Number(r.lng) },
    { lat: Number(r.dropoff_lat), lng: Number(r.dropoff_lng) },
  );
  const gap_m = Math.round(gapKm * 1000);
  const radius = radiusFor(r.dropoff_source);
  const stale = r.updated_at ? (Date.now() - new Date(r.updated_at).getTime()) > 120000 : true;
  // Only flag on distance we can actually trust. A rider must never be accused
  // because the CUSTOMER's address was vague.
  const flagged = gap_m > radius || stale;

  await db.query(
    `UPDATE orders SET delivered_lat=$2, delivered_lng=$3, delivered_gap_m=$4, delivery_flagged=$5 WHERE id=$1`,
    [orderId, r.lat, r.lng, gap_m, flagged]);

  if (flagged) {
    await db.query(`INSERT INTO rider_stats (rider_id, late) VALUES ($1,1)
                    ON CONFLICT (rider_id) DO UPDATE SET late = rider_stats.late + 1`, [riderId]);
    await logEvent(db, {
      order_id: orderId, rider_id: riderId, type: 'ACTUAL', reason: 'DELIVERY_OUT_OF_RANGE',
      meta: { gap_m, radius_m: radius, source: r.dropoff_source, gps_stale: stale },
    });
  }
  return { gap_m, flagged };
}

// Everything the admin needs to audit one delivery.
export async function deliveryAudit(db: Db, orderId: string) {
  const { rows: ord } = await db.query(
    `SELECT o.id, o.status, o.delivered_lat, o.delivered_lng, o.delivered_gap_m, o.delivery_flagged,
            o.dropoff_lat, o.dropoff_lng, o.delivery_address, o.dropoff_source,
            s.lat AS store_lat, s.lng AS store_lng, s.name AS store_name,
            a.name AS rider_name, a.phone AS rider_phone, o.rider_id
       FROM orders o
       JOIN merchant_stores s ON s.account_id = o.store_id
       LEFT JOIN accounts a ON a.id = o.rider_id
      WHERE o.id = $1`, [orderId]);
  if (!ord[0]) return null;

  const { rows: trail } = await db.query(
    `SELECT lat, lng, at FROM rider_traces WHERE order_id=$1 ORDER BY at ASC`, [orderId]);

  // total distance the rider actually covered
  let travelled = 0;
  for (let i = 1; i < trail.length; i++) {
    travelled += haversineKm(
      { lat: Number(trail[i - 1].lat), lng: Number(trail[i - 1].lng) },
      { lat: Number(trail[i].lat), lng: Number(trail[i].lng) },
    );
  }

  return {
    order: ord[0],
    // the path they ACTUALLY drove, [lng,lat] for the map
    trail: trail.map((t: any) => [Number(t.lng), Number(t.lat)] as [number, number]),
    points: trail.length,
    travelled_km: Math.round(travelled * 10) / 10,
    ended_at: trail.length ? trail[trail.length - 1].at : null,
    gap_m: ord[0].delivered_gap_m,
    flagged: ord[0].delivery_flagged,
    radius_m: radiusFor(ord[0].dropoff_source),
    dropoff_source: ord[0].dropoff_source,   // 'pin' = customer confirmed the spot
  };
}

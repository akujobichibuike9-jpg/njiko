import type { Db } from '../../core/db';

export interface Order {
  id: string; user_id: string; store_id: string; rider_id: string | null; status: string;
  subtotal: number; delivery_fee: number; total: number;
  delivery_address: string | null; payment_method: string; created_at: string;
}
export interface OrderItem { id: string; order_id: string; name: string; price: number; qty: number; image_url: string | null; }

const DELIVERY_FEE = 0;

export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
      store_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'placed',
      subtotal numeric(10,2) NOT NULL DEFAULT 0,
      delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
      total numeric(10,2) NOT NULL DEFAULT 0,
      delivery_address text,
      payment_method text NOT NULL DEFAULT 'cod',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
      name text NOT NULL, price numeric(10,2) NOT NULL, qty int NOT NULL, image_url text
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
    CREATE TABLE IF NOT EXISTS order_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
      status text NOT NULL,
      actor_role text,
      actor_name text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS dropoff_lat double precision;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS dropoff_lng double precision;
    CREATE TABLE IF NOT EXISTS rider_locations (
      rider_id   uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      lat        double precision,
      lng        double precision,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS orders_store_idx ON orders(store_id);
    CREATE INDEX IF NOT EXISTS orders_user_idx  ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_rider_idx ON orders(rider_id);
    CREATE INDEX IF NOT EXISTS order_events_idx ON order_events(order_id);
  `);
}

// Append-only audit entry for a status change (records who + when).
async function logEvent(db: Db, orderId: string, status: string, actorRole: string, actorId: string) {
  let name: string | null = null;
  try { const r = await db.query<{ name: string | null }>(`SELECT name FROM accounts WHERE id = $1`, [actorId]); name = r.rows[0]?.name ?? null; } catch { /* ignore */ }
  await db.query(`INSERT INTO order_events (order_id, status, actor_role, actor_name) VALUES ($1,$2,$3,$4)`, [orderId, status, actorRole, name]);
}

async function attachItems(db: Db, orders: any[]) {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const items = (await db.query<OrderItem>(
    `SELECT id, order_id, name, price::float8 AS price, qty, image_url FROM order_items WHERE order_id = ANY($1::uuid[])`, [ids])).rows;
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) }));
}

export async function createFromCart(db: Db, userId: string, deliveryAddress: string, lines: { itemId: string; qty: number }[], note?: string) {
  // customer's note to the merchant (e.g. "no pepper", "call at the gate")
  await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS note text`);
  if (!lines.length) throw Object.assign(new Error('Cart is empty'), { status: 400 });
  const ids = lines.map((l) => l.itemId);
  const items = (await db.query(
    `SELECT id, account_id AS store_id, name, price::float8 AS price, image_url FROM menu_items WHERE id = ANY($1::uuid[])`, [ids])).rows as any[];
  const qtyById = new Map(lines.map((l) => [l.itemId, l.qty]));
  const groups = new Map<string, any[]>();
  for (const it of items) {
    const qty = qtyById.get(it.id) || 0;
    if (qty <= 0) continue;
    if (!groups.has(it.store_id)) groups.set(it.store_id, []);
    groups.get(it.store_id)!.push({ ...it, qty });
  }
  if (!groups.size) throw Object.assign(new Error('No valid items in cart'), { status: 400 });

  const prof = await db.query<{ lat: number | null; lng: number | null }>(`SELECT lat, lng FROM user_profiles WHERE account_id = $1`, [userId]);
  const dLat = prof.rows[0]?.lat ?? null;
  const dLng = prof.rows[0]?.lng ?? null;

  const created: Order[] = [];
  for (const [storeId, its] of groups) {
    const subtotal = its.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal + DELIVERY_FEE;
    const o = (await db.query<Order>(
      `INSERT INTO orders (user_id, store_id, status, subtotal, delivery_fee, total, delivery_address, payment_method, dropoff_lat, dropoff_lng, note)
       VALUES ($1,$2,'placed',$3,$4,$5,$6,'cod',$7,$8,$9) RETURNING *`,
      [userId, storeId, subtotal, DELIVERY_FEE, total, deliveryAddress, dLat, dLng, note ?? null])).rows[0];
    for (const i of its) {
      await db.query(`INSERT INTO order_items (order_id, name, price, qty, image_url) VALUES ($1,$2,$3,$4,$5)`, [o.id, i.name, i.price, i.qty, i.image_url]);
    }
    await logEvent(db, o.id, 'placed', 'user', userId);
    created.push(o);
  }
  return created;
}

export async function getCustomerOrders(db: Db, userId: string) {
  const o = (await db.query(`
    SELECT o.*, s.name AS store_name, r.name AS rider_name FROM orders o
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    LEFT JOIN accounts r ON r.id = o.rider_id
    WHERE o.user_id = $1 ORDER BY o.created_at DESC`, [userId])).rows;
  return attachItems(db, o);
}
export async function getMerchantOrders(db: Db, storeId: string) {
  const o = (await db.query(`
    SELECT o.*, r.name AS rider_name FROM orders o
    LEFT JOIN accounts r ON r.id = o.rider_id
    WHERE o.store_id = $1 ORDER BY o.created_at DESC`, [storeId])).rows;
  return attachItems(db, o);
}
export async function updateStatus(db: Db, storeId: string, orderId: string, status: string) {
  const allowed = ['accepted', 'rejected', 'preparing', 'ready'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  const r = await db.query<Order>(`UPDATE orders SET status = $3, updated_at = now() WHERE id = $2 AND store_id = $1 RETURNING *`, [storeId, orderId, status]);
  const row = r.rows[0] ?? null;
  if (row) await logEvent(db, orderId, status, 'merchant', storeId);
  return row;
}

export async function cancelOrder(db: Db, userId: string, orderId: string) {
  const r = await db.query<Order>(
    `UPDATE orders SET status = 'cancelled', updated_at = now()
     WHERE id = $2 AND user_id = $1 AND status IN ('placed','accepted') RETURNING *`, [userId, orderId]);
  const row = r.rows[0] ?? null;
  if (row) await logEvent(db, orderId, 'cancelled', 'user', userId);
  return row;
}

export async function getOrderEvents(db: Db, orderId: string) {
  const r = await db.query(`SELECT status, actor_role, actor_name, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]);
  return r.rows;
}
export async function getOrderById(db: Db, orderId: string): Promise<Order | null> {
  const r = await db.query<Order>(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  return r.rows[0] ?? null;
}

/* ---- rider ---- */
export async function getAvailableJobs(db: Db) {
  const o = (await db.query(`
    SELECT o.*, s.name AS store_name, s.address AS store_address FROM orders o
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    WHERE o.status = 'ready' AND o.rider_id IS NULL ORDER BY o.created_at ASC`)).rows;
  return attachItems(db, o);
}
export async function getRiderJobs(db: Db, riderId: string) {
  const o = (await db.query(`
    SELECT o.*, s.name AS store_name, s.address AS store_address, s.lat AS store_lat, s.lng AS store_lng FROM orders o
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    WHERE o.rider_id = $1 AND o.status IN ('assigned','picked_up') ORDER BY o.created_at ASC`, [riderId])).rows;
  return attachItems(db, o);
}
export async function getRiderHistory(db: Db, riderId: string) {
  const o = (await db.query(`
    SELECT o.*, s.name AS store_name, s.address AS store_address FROM orders o
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    WHERE o.rider_id = $1 AND o.status = 'delivered' ORDER BY o.created_at DESC`, [riderId])).rows;
  return attachItems(db, o);
}
export async function acceptJob(db: Db, riderId: string, orderId: string) {
  const r = await db.query<Order>(
    `UPDATE orders SET rider_id = $1, status = 'assigned', updated_at = now()
     WHERE id = $2 AND status = 'ready' AND rider_id IS NULL RETURNING *`, [riderId, orderId]);
  const row = r.rows[0] ?? null;
  if (row) await logEvent(db, orderId, 'assigned', 'rider', riderId);
  return row;
}
export async function riderUpdateStatus(db: Db, riderId: string, orderId: string, status: string) {
  const allowed = ['picked_up', 'delivered'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  const r = await db.query<Order>(`UPDATE orders SET status = $3, updated_at = now() WHERE id = $2 AND rider_id = $1 RETURNING *`, [riderId, orderId, status]);
  const row = r.rows[0] ?? null;
  if (row) await logEvent(db, orderId, status, 'rider', riderId);
  return row;
}

/* ---- live tracking + routing (Geoapify) ---- */
const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY ?? '';

// Routes through any number of waypoints, e.g. rider -> store -> customer.
export async function routeVia(pts: { lat: number | null; lng: number | null }[]) {
  if (!GEOAPIFY_KEY) return null;
  if (pts.length < 2 || pts.some((p) => !p || p.lat == null || p.lng == null)) return null;
  try {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${pts.map((p) => `${p.lat},${p.lng}`).join('|')}&mode=drive&apiKey=${GEOAPIFY_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j: any = await res.json();
    const f = j.features?.[0];
    if (!f) return null;
    let coords: [number, number][] = [];
    if (f.geometry.type === 'LineString') coords = f.geometry.coordinates;
    else if (f.geometry.type === 'MultiLineString') coords = f.geometry.coordinates.flat();
    const props = f.properties ?? {};
    return { coordinates: coords, durationMin: Math.max(1, Math.round((props.time ?? 0) / 60)), distanceKm: Number(((props.distance ?? 0) / 1000).toFixed(1)) };
  } catch { return null; }
}
// Two-point convenience wrapper (existing callers).
export async function routeBetween(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  return routeVia([a, b]);
}

export async function setRiderLocation(db: Db, riderId: string, lat: number, lng: number) {
  await db.query(
    `INSERT INTO rider_locations (rider_id, lat, lng, updated_at) VALUES ($1,$2,$3, now())
     ON CONFLICT (rider_id) DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = now()`,
    [riderId, lat, lng]);
}

export async function getTracking(db: Db, orderId: string) {
  const r = await db.query<any>(`
    SELECT o.id, o.status, o.rider_id, o.delivery_address, o.dropoff_lat, o.dropoff_lng,
           s.name AS store_name, s.lat AS store_lat, s.lng AS store_lng,
           rl.lat AS rider_lat, rl.lng AS rider_lng, rl.updated_at AS rider_at,
           r.name AS rider_name, r.phone AS rider_phone
    FROM orders o
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    LEFT JOIN rider_locations rl ON rl.rider_id = o.rider_id
    LEFT JOIN accounts r ON r.id = o.rider_id
    WHERE o.id = $1`, [orderId]);
  const x = r.rows[0];
  if (!x) return null;
  const pickup = { lat: x.store_lat, lng: x.store_lng };
  const dropoff = { lat: x.dropoff_lat, lng: x.dropoff_lng };
  const rider = x.rider_id && x.rider_lat != null ? { lat: x.rider_lat, lng: x.rider_lng, at: x.rider_at, name: x.rider_name, phone: x.rider_phone } : null;
  // Route the REAL journey:
  //  - rider assigned but not yet collected  -> rider → store (pickup) → customer (dropoff)
  //  - rider has picked up                   -> rider → customer
  //  - no rider yet                          -> store → customer
  const collected = x.status === 'picked_up' || x.status === 'delivered';
  const waypoints = rider
    ? (collected ? [rider, dropoff] : [rider, pickup, dropoff])
    : [pickup, dropoff];
  const route = await routeVia(waypoints);

  // The leg the rider is currently driving (used by the rider app for its own ETA).
  const legTo = rider ? (collected ? dropoff : pickup) : null;
  const leg = rider && legTo ? await routeVia([rider, legTo]) : null;
  return {
    status: x.status,
    store_name: x.store_name,
    delivery_address: x.delivery_address,
    pickup, dropoff, rider,
    route: route ? route.coordinates : null,
    eta_min: route ? route.durationMin : null,
    distance_km: route ? route.distanceKm : null,
    // current leg for the rider: to the store before pickup, to the customer after
    leg_to: collected ? 'dropoff' : 'pickup',
    leg_route: leg ? leg.coordinates : null,
    leg_eta_min: leg ? leg.durationMin : null,
    leg_distance_km: leg ? leg.distanceKm : null,
  };
}

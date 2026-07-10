import type { Db } from '../../core/db';

export interface Store {
  id: string;
  account_id: string;
  name: string | null;
  category: string | null;
  location_mode: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  payout_bank: string | null;
  payout_account: string | null;
  payout_name: string | null;
  online: boolean;
}

export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS merchant_stores (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id    uuid UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
      name          text,
      category      text,
      location_mode text DEFAULT 'auto',
      lat           double precision,
      lng           double precision,
      address       text,
      created_at    timestamptz DEFAULT now(),
      updated_at    timestamptz DEFAULT now()
    );
    ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS payout_bank    text;
    ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS payout_account text;
    ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS payout_name    text;
    ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS online         boolean NOT NULL DEFAULT false;
  `);
}

export async function getStore(db: Db, accountId: string): Promise<Store | null> {
  const r = await db.query<Store>(`SELECT * FROM merchant_stores WHERE account_id = $1`, [accountId]);
  return r.rows[0] ?? null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'delivery-platform/0.1 (dev)' } });
    if (!res.ok) return null;
    const j: any = await res.json();
    const a = j.address ?? {};
    const parts = [a.road, a.suburb || a.neighbourhood || a.hamlet, a.city || a.town || a.village || a.county].filter(Boolean);
    return parts.slice(0, 3).join(', ') || j.display_name || null;
  } catch { return null; }
}

export async function setLocation(db: Db, accountId: string, input: {
  mode: 'auto' | 'manual'; lat?: number; lng?: number; address?: string;
}): Promise<Store> {
  let { mode, lat = null, lng = null, address = null } = input as any;
  if (mode === 'auto') {
    if (lat == null || lng == null) throw Object.assign(new Error('lat and lng required'), { status: 400 });
    address = (await reverseGeocode(lat, lng)) ?? `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } else {
    if (!address) throw Object.assign(new Error('address required'), { status: 400 });
  }
  const acc = await db.query<{ name: string | null }>(`SELECT name FROM accounts WHERE id = $1`, [accountId]);
  const defaultName = acc.rows[0]?.name ?? null;
  const r = await db.query<Store>(`
    INSERT INTO merchant_stores (account_id, name, location_mode, lat, lng, address, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, now())
    ON CONFLICT (account_id) DO UPDATE SET
      location_mode = EXCLUDED.location_mode, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
      address = EXCLUDED.address, name = COALESCE(merchant_stores.name, EXCLUDED.name), updated_at = now()
    RETURNING *`,
    [accountId, defaultName, mode, lat, lng, address]);
  return r.rows[0];
}

export async function updateProfile(db: Db, accountId: string, input: {
  name?: string; category?: string; payout_bank?: string; payout_account?: string; payout_name?: string;
}): Promise<Store | null> {
  const r = await db.query<Store>(`
    UPDATE merchant_stores SET
      name = COALESCE($2, name), category = COALESCE($3, category),
      payout_bank = COALESCE($4, payout_bank), payout_account = COALESCE($5, payout_account),
      payout_name = COALESCE($6, payout_name), updated_at = now()
    WHERE account_id = $1 RETURNING *`,
    [accountId, input.name ?? null, input.category ?? null, input.payout_bank ?? null, input.payout_account ?? null, input.payout_name ?? null]);
  return r.rows[0] ?? null;
}

export async function setOnline(db: Db, accountId: string, online: boolean): Promise<Store | null> {
  const r = await db.query<Store>(`UPDATE merchant_stores SET online = $2, updated_at = now() WHERE account_id = $1 RETURNING *`, [accountId, online]);
  return r.rows[0] ?? null;
}

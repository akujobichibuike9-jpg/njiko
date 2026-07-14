import type { Db } from '../../core/db';

export interface UserProfile { account_id: string; address: string | null; lat: number | null; lng: number | null; }

export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      address    text,
      lat        double precision,
      lng        double precision,
      updated_at timestamptz DEFAULT now()
    );
  `);
}

export async function getProfile(db: Db, accountId: string): Promise<UserProfile | null> {
  const r = await db.query<UserProfile>(`SELECT account_id, address, lat, lng FROM user_profiles WHERE account_id = $1`, [accountId]);
  return r.rows[0] ?? null;
}

// Typed addresses previously saved with NO coordinates at all, which made the order
// invisible to dispatch (no dropoff = skipped) and impossible to map. Geocode them.
async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GEOAPIFY_KEY;
  if (!key) return null;
  try {
    // bias to Owerri / Nigeria so vague strings resolve locally rather than worldwide
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&filter=countrycode:ng&bias=proximity:7.0333,5.4836&limit=1&apiKey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: any = await r.json();
    const f = j?.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng };
  } catch { return null; }
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

export async function setAddress(db: Db, accountId: string, input: {
  mode: 'auto' | 'manual'; lat?: number; lng?: number; address?: string;
}): Promise<UserProfile> {
  let { mode, lat = null, lng = null, address = null } = input as any;
  if (mode === 'auto') {
    if (lat == null || lng == null) throw Object.assign(new Error('lat and lng required'), { status: 400 });
    address = (await reverseGeocode(lat, lng)) ?? `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } else {
    if (!address) throw Object.assign(new Error('address required'), { status: 400 });
    // resolve typed addresses to coordinates — without these the order can't be dispatched or mapped
    if (lat == null || lng == null) {
      const g = await forwardGeocode(address);
      if (g) { lat = g.lat; lng = g.lng; }
    }
  }
  const r = await db.query<UserProfile>(`
    INSERT INTO user_profiles (account_id, address, lat, lng, updated_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (account_id) DO UPDATE SET address = EXCLUDED.address, lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = now()
    RETURNING account_id, address, lat, lng`,
    [accountId, address, lat, lng]);
  return r.rows[0];
}

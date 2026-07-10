import type { Db } from '../../core/db';
import { getTracking, getOrderEvents } from '../orders/service';

export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
    CREATE TABLE IF NOT EXISTS platform_settings (key text PRIMARY KEY, value text);
    INSERT INTO platform_settings (key, value) VALUES ('maintenance', 'off') ON CONFLICT (key) DO NOTHING;
  `);
}

export async function overview(db: Db) {
  const roles = await db.query<{ role: string; n: number }>(`SELECT role, count(*)::int AS n FROM accounts GROUP BY role`);
  const ord = await db.query<{ n: number; gmv: number }>(`SELECT count(*)::int AS n, coalesce(sum(total),0)::float8 AS gmv FROM orders`);
  const delivered = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM orders WHERE status = 'delivered'`);
  const byStatus = await db.query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM orders GROUP BY status ORDER BY n DESC`);
  const map: Record<string, number> = {};
  roles.rows.forEach((r) => { map[r.role] = r.n; });
  return {
    users: map.user || 0, merchants: map.merchant || 0, riders: map.rider || 0, admins: map.admin || 0,
    orders: ord.rows[0].n, gmv: ord.rows[0].gmv, delivered: delivered.rows[0].n,
    ordersByStatus: byStatus.rows,
  };
}

export async function listAccounts(db: Db, role: string | null, q: string | null, sort: string | null) {
  const clauses: string[] = []; const params: any[] = [];
  if (role) { params.push(role); clauses.push(`role = $${params.length}`); }
  if (q && q.trim()) { params.push(`%${q.trim()}%`); const i = params.length; clauses.push(`(name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const order = sort === 'oldest' ? 'created_at ASC' : sort === 'name' ? 'name ASC NULLS LAST' : 'created_at DESC';
  const r = await db.query(`SELECT id, role, name, email, phone, blocked, created_at FROM accounts ${where} ORDER BY ${order} LIMIT 300`, params);
  return r.rows;
}

export async function accountDetail(db: Db, id: string) {
  const a = await db.query(`SELECT id, role, name, email, phone, blocked, created_at FROM accounts WHERE id = $1`, [id]);
  const acct = a.rows[0];
  if (!acct) return null;
  const col = acct.role === 'merchant' ? 'store_id' : acct.role === 'rider' ? 'rider_id' : 'user_id';
  const orders = (await db.query(`SELECT id, status, total::float8 AS total, created_at FROM orders WHERE ${col} = $1 ORDER BY created_at DESC LIMIT 50`, [id])).rows;
  return { account: acct, orders };
}

export async function setBlocked(db: Db, id: string, blocked: boolean) { await db.query(`UPDATE accounts SET blocked = $2 WHERE id = $1`, [id, blocked]); }
export async function deleteAccount(db: Db, id: string) { await db.query(`DELETE FROM accounts WHERE id = $1`, [id]); }
export async function getMaintenance(db: Db): Promise<boolean> { const r = await db.query<{ value: string }>(`SELECT value FROM platform_settings WHERE key = 'maintenance'`); return r.rows[0]?.value === 'on'; }
export async function setMaintenance(db: Db, on: boolean) { await db.query(`INSERT INTO platform_settings (key, value) VALUES ('maintenance', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [on ? 'on' : 'off']); }

/* ---- orders oversight + global search ---- */
export async function allOrders(db: Db, group: string | null, q: string | null) {
  const clauses: string[] = []; const params: any[] = [];
  if (group === 'live') clauses.push(`o.status NOT IN ('delivered','cancelled','rejected')`);
  else if (group === 'delivered') clauses.push(`o.status = 'delivered'`);
  else if (group === 'cancelled') clauses.push(`o.status IN ('cancelled','rejected')`);
  if (q && q.trim()) { params.push(`%${q.trim()}%`); const i = params.length; clauses.push(`(o.id::text ILIKE $${i} OR cu.name ILIKE $${i} OR s.name ILIKE $${i} OR ri.name ILIKE $${i})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const r = await db.query(`
    SELECT o.id, o.status, o.total::float8 AS total, o.created_at, o.delivery_address,
           cu.name AS customer_name, s.name AS store_name, ri.name AS rider_name
    FROM orders o
    LEFT JOIN accounts cu ON cu.id = o.user_id
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    LEFT JOIN accounts ri ON ri.id = o.rider_id
    ${where} ORDER BY o.created_at DESC LIMIT 200`, params);
  return r.rows;
}

export async function globalSearch(db: Db, q: string) {
  const like = `%${q.trim()}%`;
  const accounts = (await db.query(`SELECT id, role, name, email, phone, blocked, created_at FROM accounts WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 15`, [like])).rows;
  const orders = (await db.query(`
    SELECT o.id, o.status, o.total::float8 AS total, o.created_at, s.name AS store_name, cu.name AS customer_name
    FROM orders o LEFT JOIN merchant_stores s ON s.account_id = o.store_id LEFT JOIN accounts cu ON cu.id = o.user_id
    WHERE o.id::text ILIKE $1 ORDER BY o.created_at DESC LIMIT 15`, [like])).rows;
  return { accounts, orders };
}

export async function adminOrderDetail(db: Db, id: string) {
  const o = (await db.query(`
    SELECT o.*, cu.name AS customer_name, cu.phone AS customer_phone, s.name AS store_name, ri.name AS rider_name
    FROM orders o
    LEFT JOIN accounts cu ON cu.id = o.user_id
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    LEFT JOIN accounts ri ON ri.id = o.rider_id
    WHERE o.id = $1`, [id])).rows[0];
  if (!o) return null;
  const items = (await db.query(`SELECT name, price::float8 AS price, qty FROM order_items WHERE order_id = $1`, [id])).rows;
  const events = await getOrderEvents(db, id);
  const tracking = await getTracking(db, id);
  return { order: o, items, events, tracking };
}

/* ---- live fleet (riders on an active delivery with a recent location) ---- */
export async function fleet(db: Db) {
  const r = await db.query(`
    SELECT o.id AS order_id, o.status, o.delivery_address,
           ri.id AS rider_id, ri.name AS rider_name, ri.phone AS rider_phone,
           s.name AS store_name, s.address AS store_address, s.lat AS store_lat, s.lng AS store_lng,
           cu.name AS customer_name,
           rl.lat AS rider_lat, rl.lng AS rider_lng, rl.updated_at AS rider_at
    FROM orders o
    JOIN accounts ri ON ri.id = o.rider_id
    JOIN rider_locations rl ON rl.rider_id = o.rider_id
    LEFT JOIN merchant_stores s ON s.account_id = o.store_id
    LEFT JOIN accounts cu ON cu.id = o.user_id
    WHERE o.status IN ('assigned','picked_up')
      AND rl.updated_at > now() - interval '2 minutes'
    ORDER BY rl.updated_at DESC
  `);
  return r.rows;
}

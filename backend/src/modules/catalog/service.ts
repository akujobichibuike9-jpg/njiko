import type { Db } from '../../core/db';

// Reads across the merchant + menu tables to build the customer-facing catalog.
export async function listStores(db: Db) {
  const r = await db.query(`
    SELECT account_id AS id, name, category, address, lat, lng, online
    FROM merchant_stores
    WHERE address IS NOT NULL
    ORDER BY online DESC, name NULLS LAST
  `);
  return r.rows;
}

export async function getStoreWithMenu(db: Db, accountId: string) {
  const s = await db.query(`SELECT account_id AS id, name, category, address FROM merchant_stores WHERE account_id = $1`, [accountId]);
  if (!s.rows[0]) return null;
  const items = await db.query(`
    SELECT id, name, price::float8 AS price, image_url
    FROM menu_items
    WHERE account_id = $1 AND available = true
    ORDER BY created_at DESC
  `, [accountId]);
  return { store: s.rows[0], items: items.rows };
}

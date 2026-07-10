import type { Db } from '../../core/db';

export interface MenuItem {
  id: string;
  account_id: string;
  name: string;
  price: number;
  available: boolean;
  image_url: string | null;
  created_at: string;
}

export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
      name       text NOT NULL,
      price      numeric(10,2) NOT NULL DEFAULT 0,
      available  boolean NOT NULL DEFAULT true,
      image_url  text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS menu_items_account_idx ON menu_items(account_id);
  `);
}

export async function listItems(db: Db, accountId: string): Promise<MenuItem[]> {
  const r = await db.query<MenuItem>(
    `SELECT * FROM menu_items WHERE account_id = $1 ORDER BY created_at DESC`, [accountId]);
  return r.rows;
}

export async function createItem(db: Db, accountId: string, input: {
  name: string; price: number; available?: boolean; image_url?: string | null;
}): Promise<MenuItem> {
  const r = await db.query<MenuItem>(
    `INSERT INTO menu_items (account_id, name, price, available, image_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [accountId, input.name, input.price, input.available ?? true, input.image_url ?? null]);
  return r.rows[0];
}

export async function setAvailable(db: Db, accountId: string, id: string, available: boolean): Promise<MenuItem | null> {
  const r = await db.query<MenuItem>(
    `UPDATE menu_items SET available = $3 WHERE id = $2 AND account_id = $1 RETURNING *`,
    [accountId, id, available]);
  return r.rows[0] ?? null;
}

export async function deleteItem(db: Db, accountId: string, id: string): Promise<boolean> {
  const r = await db.query(`DELETE FROM menu_items WHERE id = $2 AND account_id = $1`, [accountId, id]);
  return r.rowCount > 0;
}

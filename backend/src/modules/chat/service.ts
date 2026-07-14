import type { Db } from '../../core/db';

export async function ensureTables(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL,
      sender_id uuid NOT NULL,
      sender_role text NOT NULL,          -- 'user' | 'rider'
      body text,
      image_url text,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS messages_order ON messages (order_id, created_at);
  `);
}

/** Only the customer and the assigned rider may see or post to an order's thread. */
async function party(db: Db, orderId: string, accountId: string) {
  const { rows } = await db.query(
    `SELECT user_id, rider_id, status FROM orders WHERE id = $1`, [orderId]);
  const o = rows[0];
  if (!o) return null;
  if (o.user_id === accountId) return { role: 'user' as const, order: o };
  if (o.rider_id === accountId) return { role: 'rider' as const, order: o };
  return null;
}

export async function listMessages(db: Db, orderId: string, accountId: string) {
  const p = await party(db, orderId, accountId);
  if (!p) { const e: any = new Error('Not your order'); e.status = 403; throw e; }

  const { rows } = await db.query(
    `SELECT m.id, m.sender_role, m.body, m.image_url, m.created_at,
            a.name AS sender_name
       FROM messages m
       JOIN accounts a ON a.id = m.sender_id
      WHERE m.order_id = $1
      ORDER BY m.created_at ASC`, [orderId]);

  // mark the other side's messages as read
  await db.query(
    `UPDATE messages SET read_at = now()
      WHERE order_id = $1 AND sender_id <> $2 AND read_at IS NULL`, [orderId, accountId]);

  return { messages: rows, canChat: p.order.rider_id != null && p.order.status !== 'delivered' && p.order.status !== 'cancelled' };
}

export async function sendMessage(db: Db, orderId: string, accountId: string, body: string | null, imageUrl: string | null) {
  const p = await party(db, orderId, accountId);
  if (!p) { const e: any = new Error('Not your order'); e.status = 403; throw e; }
  if (!p.order.rider_id) { const e: any = new Error('No rider assigned yet'); e.status = 409; throw e; }
  if (!body && !imageUrl) { const e: any = new Error('Nothing to send'); e.status = 400; throw e; }

  const { rows } = await db.query(
    `INSERT INTO messages (order_id, sender_id, sender_role, body, image_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, sender_role, body, image_url, created_at`,
    [orderId, accountId, p.role, body, imageUrl]);
  return rows[0];
}

/** Unread count so the app can badge the chat button. */
export async function unreadCount(db: Db, orderId: string, accountId: string) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM messages
      WHERE order_id = $1 AND sender_id <> $2 AND read_at IS NULL`, [orderId, accountId]);
  return rows[0]?.n ?? 0;
}

/** Admin oversight: read any thread. */
export async function adminThread(db: Db, orderId: string) {
  const { rows } = await db.query(
    `SELECT m.sender_role, m.body, m.image_url, m.created_at, a.name AS sender_name
       FROM messages m JOIN accounts a ON a.id = m.sender_id
      WHERE m.order_id = $1 ORDER BY m.created_at ASC`, [orderId]);
  return rows;
}

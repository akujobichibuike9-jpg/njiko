import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Db } from '../../core/db';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';
const RISK_BLOCK_NOTE = 'flagged for review'; // we flag, never hard-block on device/ip

export type Role = 'user' | 'merchant' | 'rider' | 'admin';

export interface Account {
  id: string;
  role: Role;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  risk_flagged: boolean;
  created_at: string;
}

interface AccountRow extends Account {
  password_hash: string;
}

// Each module owns its tables. Idempotent, so it's safe to run on every boot.
export async function ensureSchema(db: Db): Promise<void> {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS accounts (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      role          text NOT NULL,
      name          text,
      email         text,
      phone         text,
      password_hash text NOT NULL,
      status        text NOT NULL DEFAULT 'active',
      risk_flagged  boolean NOT NULL DEFAULT false,
      created_at    timestamptz NOT NULL DEFAULT now(),
      UNIQUE (role, email),
      UNIQUE (role, phone)
    );

    CREATE TABLE IF NOT EXISTS signup_signals (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id         uuid REFERENCES accounts(id) ON DELETE CASCADE,
      role               text NOT NULL,
      device_fingerprint text,
      ip                 text,
      risk_score         int NOT NULL DEFAULT 0,
      created_at         timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash text PRIMARY KEY,
      account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
      role       text NOT NULL,
      expires_at timestamptz NOT NULL,
      used       boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

const publicAccount = (r: AccountRow): Account => ({
  id: r.id, role: r.role, name: r.name, email: r.email,
  phone: r.phone, status: r.status, risk_flagged: r.risk_flagged, created_at: r.created_at,
});

function signToken(a: { id: string; role: Role }): string {
  return jwt.sign({ sub: a.id, role: a.role }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { sub: string; role: Role } {
  return jwt.verify(token, JWT_SECRET) as { sub: string; role: Role };
}

// Simple heuristic: same device or IP creating many accounts recently looks risky.
// Returns a score; caller decides. We FLAG (never block) so shared networks aren't punished.
async function riskScore(db: Db, role: Role, deviceFingerprint?: string, ip?: string) {
  const countBy = async (col: 'device_fingerprint' | 'ip', val?: string) => {
    if (!val) return 0;
    const r = await db.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM signup_signals
       WHERE ${col} = $1 AND created_at > now() - interval '30 days'`, [val]);
    return r.rows[0]?.c ?? 0;
  };
  const dev = await countBy('device_fingerprint', deviceFingerprint);
  const ipc = await countBy('ip', ip);
  const score = dev * 40 + ipc * 10;
  return { score, flagged: score >= 50 };
}

export async function createAccount(db: Db, input: {
  role: Role; name: string; email?: string; phone?: string; password: string;
  deviceFingerprint?: string; ip?: string | null;
}): Promise<{ account: Account; token: string; flagged: boolean }> {
  const hash = await bcrypt.hash(input.password, 10);
  const risk = await riskScore(db, input.role, input.deviceFingerprint, input.ip ?? undefined);

  const inserted = await db.query<AccountRow>(
    `INSERT INTO accounts (role, name, email, phone, password_hash, risk_flagged)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.role, input.name, input.email ?? null, input.phone ?? null, hash, risk.flagged],
  );
  const row = inserted.rows[0];

  await db.query(
    `INSERT INTO signup_signals (account_id, role, device_fingerprint, ip, risk_score)
     VALUES ($1,$2,$3,$4,$5)`,
    [row.id, input.role, input.deviceFingerprint ?? null, input.ip ?? null, risk.score],
  );

  return { account: publicAccount(row), token: signToken(row), flagged: risk.flagged };
}

export async function login(db: Db, input: { role: Role; identifier: string; password: string }) {
  const r = await db.query<AccountRow>(
    `SELECT * FROM accounts WHERE role = $1 AND (email = $2 OR phone = $2) LIMIT 1`,
    [input.role, input.identifier],
  );
  const row = r.rows[0];
  const ok = row && (await bcrypt.compare(input.password, row.password_hash));
  if (!row || !ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if ((row as any).blocked) throw Object.assign(new Error('This account has been suspended'), { status: 403 });
  return { account: publicAccount(row), token: signToken(row) };
}

export async function getAccount(db: Db, id: string): Promise<Account | null> {
  const r = await db.query<AccountRow>(`SELECT * FROM accounts WHERE id = $1`, [id]);
  return r.rows[0] ? publicAccount(r.rows[0]) : null;
}

// Shareable guard. Other modules can import this to protect their routes.
export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.account = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export async function updateAccount(db: Db, id: string, input: { name?: string; phone?: string }): Promise<Account | null> {
  const r = await db.query<AccountRow>(
    `UPDATE accounts SET name = COALESCE($2, name), phone = COALESCE($3, phone) WHERE id = $1 RETURNING *`,
    [id, input.name ?? null, input.phone ?? null],
  );
  return r.rows[0] ? publicAccount(r.rows[0]) : null;
}

export { RISK_BLOCK_NOTE };

/* ---- password reset (role-scoped, token hashed, 1h expiry) ---- */
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export async function requestReset(db: Db, role: Role, email: string): Promise<{ token: string } | null> {
  const r = await db.query<{ id: string }>(`SELECT id FROM accounts WHERE role = $1 AND email = $2 LIMIT 1`, [role, email]);
  const acct = r.rows[0];
  if (!acct) return null;
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO password_resets (token_hash, account_id, role, expires_at) VALUES ($1,$2,$3, now() + interval '1 hour')`,
    [sha256(token), acct.id, role],
  );
  return { token };
}

export async function resetPassword(db: Db, token: string, newPassword: string): Promise<void> {
  const r = await db.query<{ account_id: string }>(
    `SELECT account_id FROM password_resets WHERE token_hash = $1 AND used = false AND expires_at > now() LIMIT 1`,
    [sha256(token)],
  );
  const row = r.rows[0];
  if (!row) throw Object.assign(new Error('This reset link is invalid or has expired'), { status: 400 });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.query(`UPDATE accounts SET password_hash = $2 WHERE id = $1`, [row.account_id, hash]);
  await db.query(`UPDATE password_resets SET used = true WHERE token_hash = $1`, [sha256(token)]);
}

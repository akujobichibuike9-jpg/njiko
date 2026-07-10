import pg from 'pg';

const { Pool } = pg;

export interface Db {
  ready: boolean;
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

function sslFor(url: string) {
  if (process.env.PGSSL === 'false') return undefined;
  const local = url.includes('localhost') || url.includes('127.0.0.1');
  if (local && process.env.PGSSL !== 'true') return undefined;
  return { rejectUnauthorized: false }; // Supabase/hosted Postgres require SSL
}

// If DATABASE_URL is missing the server still boots; DB-backed routes just report unavailable.
export function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { ready: false, async query() { throw new Error('DATABASE_URL not set'); } };
  }
  const pool = new Pool({ connectionString: url, ssl: sslFor(url) });
  return {
    ready: true,
    async query(text, params) {
      const res = await pool.query(text, params);
      return { rows: res.rows as any[], rowCount: res.rowCount ?? 0 };
    },
  };
}

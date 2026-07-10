import { getToken } from './token';

// Dev: falls back to the Vite proxy ('/api'). Prod: set VITE_API_URL to the backend URL, e.g. https://your-app.up.railway.app/api
const BASE = import.meta.env.VITE_API_URL || '/api';

// Calls go to /api/* and are proxied to the backend in dev (see vite.config.ts).
// Attaches the session token when present, and surfaces the server's error message.
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

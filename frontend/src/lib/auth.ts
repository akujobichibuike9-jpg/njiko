import { api } from './api';
import { setToken } from './token';
import type { Role } from './role';

export interface Account { id: string; role: Role; name: string | null; email: string | null; phone: string | null; }

export function deviceFingerprint(): string {
  const bits = [navigator.userAgent, navigator.language, `${screen.width}x${screen.height}`, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
  let h = 0;
  for (let i = 0; i < bits.length; i++) h = (h * 31 + bits.charCodeAt(i)) | 0;
  return 'fp_' + (h >>> 0).toString(16);
}

export async function signup(input: { role: Role; name: string; email?: string; phone?: string; password: string }) {
  const r = await api<{ account: Account; token: string; flagged: boolean }>('/auth/signup', {
    method: 'POST', body: JSON.stringify({ ...input, deviceFingerprint: deviceFingerprint() }),
  });
  setToken(r.token, input.role);
  return r;
}

export async function login(input: { role: Role; identifier: string; password: string }) {
  const r = await api<{ account: Account; token: string }>('/auth/login', {
    method: 'POST', body: JSON.stringify(input),
  });
  setToken(r.token, input.role);
  return r;
}

export function forgotPassword(role: Role, email: string) {
  return api<{ ok: boolean; message: string }>('/auth/forgot', { method: 'POST', body: JSON.stringify({ role, email }) });
}
export function resetPassword(token: string, password: string) {
  return api<{ ok: boolean }>('/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
}

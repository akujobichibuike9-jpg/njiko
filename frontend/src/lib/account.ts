import { api } from './api';

export interface Account { id: string; role: string; name: string | null; email: string | null; phone: string | null; }

export function getMe() { return api<{ account: Account }>('/auth/me'); }
export function updateMe(input: { name?: string; phone?: string }) {
  return api<{ account: Account }>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) });
}

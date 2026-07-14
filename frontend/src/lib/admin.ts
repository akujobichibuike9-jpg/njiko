import { api } from './api';
import { setToken } from './token';

export interface AdminAccount { id: string; role: string; name: string | null; email: string | null; phone: string | null; blocked: boolean; created_at: string; }
export interface AdminOrder { id: string; status: string; total: number; created_at: string; delivery_address: string | null; customer_name: string | null; store_name: string | null; rider_name: string | null; }
export interface Overview { users: number; merchants: number; riders: number; admins: number; orders: number; gmv: number; delivered: number; ordersByStatus: { status: string; n: number }[]; }

export async function adminLogin(username: string, password: string) {
  const r = await api<{ token: string; username: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  setToken(r.token, 'admin');
  return r;
}
export function overview() { return api<Overview>('/admin/overview'); }
export function listAccounts(role?: string, q?: string, sort?: string) {
  const p = new URLSearchParams();
  if (role) p.set('role', role); if (q) p.set('q', q); if (sort) p.set('sort', sort);
  return api<{ accounts: AdminAccount[] }>(`/admin/accounts?${p.toString()}`);
}
export function accountDetail(id: string) { return api<{ account: AdminAccount; orders: any[] }>(`/admin/accounts/${id}`); }
export function blockAccount(id: string) { return api<{ ok: boolean }>(`/admin/accounts/${id}/block`, { method: 'POST' }); }
export function unblockAccount(id: string) { return api<{ ok: boolean }>(`/admin/accounts/${id}/unblock`, { method: 'POST' }); }
export function deleteAccount(id: string) { return api<{ ok: boolean }>(`/admin/accounts/${id}`, { method: 'DELETE' }); }
export function setMaintenance(on: boolean) { return api<{ maintenance: boolean }>('/admin/maintenance', { method: 'POST', body: JSON.stringify({ on }) }); }

export function allOrders(group?: string, q?: string) {
  const p = new URLSearchParams();
  if (group) p.set('group', group); if (q) p.set('q', q);
  return api<{ orders: AdminOrder[] }>(`/admin/orders?${p.toString()}`);
}
export function adminOrderDetail(id: string) { return api<any>(`/admin/orders/${id}`); }
export function globalSearch(q: string) { return api<{ accounts: AdminAccount[]; orders: AdminOrder[] }>(`/admin/search?q=${encodeURIComponent(q)}`); }

export interface FleetRider {
  order_id: string; status: string; delivery_address: string | null;
  rider_id: string; rider_name: string | null; rider_phone: string | null;
  store_name: string | null; store_address: string | null; store_lat: number | null; store_lng: number | null;
  customer_name: string | null; rider_lat: number; rider_lng: number; rider_at: string;
}
export function fleet() { return api<{ riders: FleetRider[] }>('/admin/fleet'); }

export async function platformStatus(): Promise<{ maintenance: boolean }> {
  try { const base = import.meta.env.VITE_API_URL || '/api'; const r = await fetch(`${base}/admin/status`); return await r.json(); } catch { return { maintenance: false }; }
}

/* ---- delivery audit: the rider's ACTUAL path + where they ended the ride ---- */
export interface DeliveryAudit {
  order: any;
  trail: [number, number][];      // the path actually driven, [lng,lat]
  points: number;
  travelled_km: number;
  ended_at: string | null;
  gap_m: number | null;           // how far from the customer the ride was ended
  flagged: boolean;
  radius_m: number;
}
export function deliveryAudit(orderId: string) { return api<DeliveryAudit>(`/dispatch/audit/${orderId}`); }
export function flaggedDeliveries() { return api<{ flagged: any[] }>('/dispatch/flagged'); }

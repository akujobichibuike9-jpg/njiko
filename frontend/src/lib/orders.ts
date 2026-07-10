import { api } from './api';

export interface OrderItem { id: string; name: string; price: number; qty: number; image_url: string | null; }
export interface OrderEvent { status: string; actor_role: string | null; actor_name: string | null; created_at: string; }
export interface Order {
  id: string; store_id: string; rider_id: string | null; status: string;
  subtotal: number; delivery_fee: number; total: number;
  delivery_address: string | null; created_at: string; items: OrderItem[];
  store_name?: string | null; store_address?: string | null; rider_name?: string | null;
  store_lat?: number | null; store_lng?: number | null; dropoff_lat?: number | null; dropoff_lng?: number | null;
}

export const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
  placed:    { label: 'Placed',         bg: '#2FE082', color: '#04231a' },
  accepted:  { label: 'Accepted',       bg: '#FBA94C', color: '#3a2400' },
  preparing: { label: 'Preparing',      bg: '#FBA94C', color: '#3a2400' },
  ready:     { label: 'Ready',          bg: '#38D996', color: '#042b1c' },
  assigned:  { label: 'Rider assigned', bg: '#FF8A3D', color: '#2a1400' },
  picked_up: { label: 'On the way',     bg: '#FF8A3D', color: '#2a1400' },
  delivered: { label: 'Delivered',      bg: '#2b3a37', color: '#7fe0c0' },
  rejected:  { label: 'Rejected',       bg: '#3a2626', color: '#ff6b6b' },
  cancelled: { label: 'Cancelled',      bg: '#3a2626', color: '#ff9b9b' },
};

// which group a status belongs to (for the top filter)
export function groupOf(status: string): 'live' | 'delivered' | 'cancelled' {
  if (status === 'delivered') return 'delivered';
  if (status === 'rejected' || status === 'cancelled') return 'cancelled';
  return 'live';
}

export function checkout(deliveryAddress: string, lines: { itemId: string; qty: number }[]) {
  return api<{ orders: Order[] }>('/orders/checkout', { method: 'POST', body: JSON.stringify({ deliveryAddress, lines }) });
}
export function customerOrders() { return api<{ orders: Order[] }>('/orders/customer'); }
export function merchantOrders() { return api<{ orders: Order[] }>('/orders/merchant'); }
export function setOrderStatus(id: string, status: string) { return api<{ order: Order }>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
export function cancelOrder(id: string) { return api<{ order: Order }>(`/orders/${id}/cancel`, { method: 'POST' }); }
export function orderEvents(id: string) { return api<{ events: OrderEvent[] }>(`/orders/${id}/events`); }

// rider
export function availableJobs() { return api<{ orders: Order[] }>('/orders/available'); }
export function riderJobs() { return api<{ orders: Order[] }>('/orders/rider'); }
export function riderHistory() { return api<{ orders: Order[] }>('/orders/rider-history'); }
export function acceptJob(id: string) { return api<{ order: Order }>(`/orders/${id}/accept`, { method: 'POST' }); }
export function riderSetStatus(id: string, status: string) { return api<{ order: Order }>(`/orders/${id}/rider-status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }

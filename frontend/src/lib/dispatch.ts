import { api } from './api';

export interface Offer {
  order_id: string;
  expires_at: string;
  total: number;
  delivery_fee: number;
  delivery_address: string;
  store_name: string;
  store_address: string;
  store_lat: number | null;
  store_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}
export interface RouteStop {
  kind: 'pickup' | 'dropoff';
  order_id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export function currentOffer() { return api<{ offer: Offer | null }>('/dispatch/offer'); }
export function acceptOffer(orderId: string) { return api<{ ok: true }>(`/dispatch/offer/${orderId}/accept`, { method: 'POST' }); }
export function declineOffer(orderId: string) { return api<{ ok: true }>(`/dispatch/offer/${orderId}/decline`, { method: 'POST' }); }
export function riderRoute() { return api<{ total_min?: number; stops: RouteStop[] }>('/dispatch/route'); }

import { api } from './api';

export interface Point { lat: number | null; lng: number | null; }
export interface Tracking {
  status: string;
  store_name: string | null;
  delivery_address: string | null;
  pickup: Point;
  dropoff: Point;
  rider: { lat: number; lng: number; at: string; name: string | null } | null;
  route: [number, number][] | null;   // [lng,lat] path from Geoapify
  eta_min: number | null;
  distance_km: number | null;
}

export function getTracking(id: string) { return api<Tracking>(`/orders/${id}/tracking`); }
export function postRiderLocation(lat: number, lng: number) {
  return api<{ ok: boolean }>('/orders/rider-location', { method: 'POST', body: JSON.stringify({ lat, lng }) });
}

// fallback straight-line ETA (only used if routing hasn't returned yet)
export function etaMinutes(a: Point | null | undefined, b: Point | null | undefined): number | null {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = ((b.lat! - a.lat!) * Math.PI) / 180;
  const dLng = ((b.lng! - a.lng!) * Math.PI) / 180;
  const la1 = (a.lat! * Math.PI) / 180, la2 = (b.lat! * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.max(2, Math.round((2 * R * Math.asin(Math.sqrt(h)) / 25) * 60));
}

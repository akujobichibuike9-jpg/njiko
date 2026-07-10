import { api } from './api';

export interface Store {
  id: string;
  name: string | null;
  category: string | null;
  location_mode: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  payout_bank: string | null;
  payout_account: string | null;
  payout_name: string | null;
  online: boolean;
}

export function getStore() {
  return api<{ store: Store | null }>('/merchant/store');
}
export function setLocationAuto(lat: number, lng: number) {
  return api<{ store: Store }>('/merchant/store/location', { method: 'POST', body: JSON.stringify({ mode: 'auto', lat, lng }) });
}
export function setLocationManual(address: string) {
  return api<{ store: Store }>('/merchant/store/location', { method: 'POST', body: JSON.stringify({ mode: 'manual', address }) });
}
export function updateProfile(input: { name?: string; category?: string; payout_bank?: string; payout_account?: string; payout_name?: string }) {
  return api<{ store: Store }>('/merchant/store', { method: 'PATCH', body: JSON.stringify(input) });
}
export function setOnline(online: boolean) {
  return api<{ store: Store }>('/merchant/store/online', { method: 'PATCH', body: JSON.stringify({ online }) });
}

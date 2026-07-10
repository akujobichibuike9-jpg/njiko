import { api } from './api';

export interface UserProfile { account_id: string; address: string | null; lat: number | null; lng: number | null; }

export function getProfile() {
  return api<{ profile: UserProfile | null }>('/user/profile');
}
export function setAddressAuto(lat: number, lng: number) {
  return api<{ profile: UserProfile }>('/user/profile/address', { method: 'POST', body: JSON.stringify({ mode: 'auto', lat, lng }) });
}
export function setAddressManual(address: string) {
  return api<{ profile: UserProfile }>('/user/profile/address', { method: 'POST', body: JSON.stringify({ mode: 'manual', address }) });
}

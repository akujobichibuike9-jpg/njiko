import { api } from './api';

export interface StoreSummary { id: string; name: string | null; category: string | null; address: string | null; online: boolean; }
export interface CatalogItem { id: string; name: string; price: number; image_url: string | null; }

export function listStores() {
  return api<{ stores: StoreSummary[] }>('/catalog/stores');
}
export function getStore(id: string) {
  return api<{ store: StoreSummary; items: CatalogItem[] }>(`/catalog/stores/${id}`);
}

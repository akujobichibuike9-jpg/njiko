import { api } from './api';
import { supabase } from './supabase';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  image_url: string | null;
}

export function listItems() {
  return api<{ items: MenuItem[] }>('/menu');
}

export function createItem(input: { name: string; price: number; image_url?: string | null }) {
  return api<{ item: MenuItem }>('/menu', { method: 'POST', body: JSON.stringify(input) });
}

export function toggleItem(id: string, available: boolean) {
  return api<{ item: MenuItem }>(`/menu/${id}/available`, { method: 'PATCH', body: JSON.stringify({ available }) });
}

export function deleteItem(id: string) {
  return api<{ ok: boolean }>(`/menu/${id}`, { method: 'DELETE' });
}

// Uploads a photo straight to the Supabase 'menu-images' bucket, returns its public URL.
export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('menu-images').upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
}

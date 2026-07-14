import { api } from './api';
import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_role: 'user' | 'rider';
  sender_name?: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
}

export function messages(orderId: string) {
  return api<{ messages: Message[]; canChat: boolean }>(`/chat/${orderId}`);
}
export function send(orderId: string, body: string | null, imageUrl: string | null) {
  return api<{ message: Message }>(`/chat/${orderId}`, { method: 'POST', body: JSON.stringify({ body, imageUrl }) });
}
export function unread(orderId: string) {
  return api<{ unread: number }>(`/chat/${orderId}/unread`);
}

/** Photos go to Supabase Storage, same as menu images. */
export async function uploadChatImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('chat-images').upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
  return data.publicUrl;
}

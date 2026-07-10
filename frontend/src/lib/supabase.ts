import { createClient } from '@supabase/supabase-js';

// Reads from frontend/.env (VITE_ vars are exposed to the browser by Vite).
const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

import { createClient } from '@supabase/supabase-js';

// Vite exposes env vars starting with VITE_ via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

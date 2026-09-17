import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[PressWala] Supabase client initialized with URL:', supabaseUrl);
  } catch (error) {
    console.error('[PressWala] Error initializing Supabase client:', error);
  }
} else {
  console.log('[PressWala] Running in Local-First / Offline Mode (Supabase credentials not set)');
}

export const supabase = supabaseInstance;

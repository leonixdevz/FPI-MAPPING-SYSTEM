import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client factory (Phase K).
 *
 * This is the only module that may import @supabase/supabase-js.
 * Components and hooks never touch Supabase directly — they go through
 * the service interfaces in src/services/, which select this adapter
 * via VITE_DATA_BACKEND=supabase.
 *
 * Env vars (see .env.example):
 *   VITE_SUPABASE_URL      — project URL, e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY — the public anon key (safe to expose; it is
 *                            constrained by Row Level Security)
 */
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

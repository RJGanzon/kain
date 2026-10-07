import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * The browser's Supabase client, or null when no backend is configured
 * (the app then runs on its bundled sample catalog, on the device only).
 * Only the public URL and publishable/anon key ever reach the client.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type Kain = SupabaseClient<Database>;

let client: Kain | null = null;

export function backendConfigured(): boolean {
  return Boolean(URL && KEY);
}

export function supabase(): Kain | null {
  if (!URL || !KEY || typeof window === 'undefined') return null;
  client ??= createClient<Database>(URL, KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

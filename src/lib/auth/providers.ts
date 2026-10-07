'use client';

import { supabase } from '@/lib/supabase/client';

export type Provider = 'google' | 'facebook';

export const PROVIDER_NAME: Record<Provider, string> = { google: 'Google', facebook: 'Facebook' };

/** Only name and email (KAIN_BUILD_PROMPT §8). */
const SCOPES: Record<Provider, string> = { google: 'email profile', facebook: 'email public_profile' };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let enabled: Promise<Record<Provider, boolean>> | null = null;

/**
 * Which providers the project has switched on (public auth settings), so a
 * tap never lands on a raw "provider is not enabled" error page.
 */
export function enabledProviders(): Promise<Record<Provider, boolean>> {
  if (!URL || !KEY) return Promise.resolve({ google: false, facebook: false });
  enabled ??= fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { external?: Record<string, boolean> } | null) => ({
      google: Boolean(s?.external?.google),
      facebook: Boolean(s?.external?.facebook),
    }))
    .catch(() => {
      enabled = null;
      return { google: false, facebook: false };
    });
  return enabled;
}

export type SignInResult = { ok: true } | { ok: false; message: string };

/** Start OAuth (PKCE): the browser goes to the provider and comes back to /auth/callback. */
export async function signInWith(provider: Provider): Promise<SignInResult> {
  const sb = supabase();
  const name = PROVIDER_NAME[provider];
  if (!sb) return { ok: false, message: `Signing in isn't set up on this copy of Kain yet. You can still plan meals without an account.` };
  if (!navigator.onLine) return { ok: false, message: `You're offline. Connect to sign in with ${name}.` };
  const on = await enabledProviders();
  if (!on[provider]) return { ok: false, message: `${name} sign-in isn't switched on for Kain yet. Try the other option, or plan without an account.` };
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${location.origin}/auth/callback`, scopes: SCOPES[provider] },
  });
  if (error) return { ok: false, message: `Couldn't reach ${name}. Check your connection and try again.` };
  return { ok: true };
}

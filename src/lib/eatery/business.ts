'use client';

import { currentSession } from '@/lib/auth/session';
import { backendConfigured, supabase } from '@/lib/supabase/client';

/**
 * Business plan, demo only (KAIN_BUILD_PROMPT §5.8, Phase 9): no payment is
 * taken. Behind NEXT_PUBLIC_BUSINESS_DEMO on the app and the business_demo
 * flag in the database.
 */

export const BUSINESS_DEMO = process.env.NEXT_PUBLIC_BUSINESS_DEMO === '1';

function setLocalPlan(plan: 'free' | 'business') {
  try {
    localStorage.setItem('kain:plan', JSON.stringify(plan));
    window.dispatchEvent(new CustomEvent('kain:device-state', { detail: 'kain:plan' }));
  } catch {
    /* storage blocked */
  }
}

export type ActivateResult = { ok: true } | { ok: false; message: string; needsSignIn?: boolean };

export async function activateBusinessDemo(): Promise<ActivateResult> {
  if (!BUSINESS_DEMO) return { ok: false, message: 'The demo activation is switched off.' };
  // A copy with no backend: the eatery lives on this phone only, so the plan does too.
  if (!backendConfigured()) {
    setLocalPlan('business');
    return { ok: true };
  }
  const sb = supabase();
  if (!sb || !currentSession()) return { ok: false, message: 'Sign in first, so the plan is saved to your account.', needsSignIn: true };
  if (!navigator.onLine) return { ok: false, message: "You're offline. Connect to start the Business plan." };
  const { data, error } = await sb.rpc('activate_business_demo');
  if (error || data !== 'business') return { ok: false, message: error?.message === 'demo activation is off' ? 'The demo activation is switched off.' : "Couldn't start the plan. Try again in a moment." };
  setLocalPlan('business');
  return { ok: true };
}

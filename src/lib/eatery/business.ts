'use client';

/**
 * Business plan, demo only (KAIN_BUILD_PROMPT §5.8, Phase 9): no payment is
 * taken, and in this build the plan is kept on the phone. Behind
 * NEXT_PUBLIC_BUSINESS_DEMO.
 */

export const BUSINESS_DEMO = process.env.NEXT_PUBLIC_BUSINESS_DEMO !== '0';

function setLocalPlan(plan: 'free' | 'business') {
  try {
    localStorage.setItem('kain:plan', JSON.stringify(plan));
    window.dispatchEvent(new CustomEvent('kain:device-state', { detail: 'kain:plan' }));
  } catch {
    /* storage blocked */
  }
}

export type ActivateResult = { ok: true } | { ok: false; message: string };

export async function activateBusinessDemo(): Promise<ActivateResult> {
  if (!BUSINESS_DEMO) return { ok: false, message: 'The demo activation is switched off.' };
  setLocalPlan('business');
  return { ok: true };
}

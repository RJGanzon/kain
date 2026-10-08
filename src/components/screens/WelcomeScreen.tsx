'use client';

import { ChevronRight, Smartphone, Soup, Store } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';

type Role = 'family' | 'eatery';

function saveRole(role: Role) {
  try {
    localStorage.setItem('kain:role', JSON.stringify(role));
    window.dispatchEvent(new CustomEvent('kain:device-state', { detail: 'kain:role' }));
  } catch {
    /* storage blocked */
  }
}

function hasFamilySettings(): boolean {
  try {
    return localStorage.getItem('kain:family') !== null;
  } catch {
    return false;
  }
}

/**
 * First open: how will you use Kain? This build has no accounts; everything
 * stays on the phone (the role picker from the Sign in design, without the
 * sign-in step).
 */
export function WelcomeScreen() {
  const choose = (role: Role) => {
    saveRole(role);
    if (role === 'eatery') nav.replace('/eatery', 'forward');
    else if (hasFamilySettings()) nav.replace('/plan', 'forward');
    else nav.replace('/plan/setup', 'push-full');
  };

  return (
    <Screen presentation="full" label="Welcome" scrollClassName="bg-brand">
      <div className="flex min-h-full flex-col">
        <div className="flex h-[330px] flex-none flex-col items-center justify-center gap-3 px-5 pt-4 pb-9">
          <Logo height={66} priority />
          <div className="text-[17px] font-extrabold tracking-[-0.01em]">More nutrition from every peso</div>
          <span className="rounded-full bg-ink px-3 py-[5px] text-[12px] font-extrabold tracking-[0.08em] text-brand uppercase">Welcome</span>
        </div>

        <div className="-mt-5 flex flex-1 flex-col gap-3.5 rounded-t-[28px] bg-white px-5 pt-[26px] pb-[calc(28px+var(--safe-bottom))]">
          <div className="flex flex-col gap-1.5 pb-1">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-good-bg px-2.5 py-1 text-[12px] font-extrabold text-good">
              <Smartphone size={12} strokeWidth={3} aria-hidden="true" />
              No account needed
            </span>
            <h1 className="mt-1 text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em]">How will you use Kain?</h1>
            <p className="text-[14px] leading-[1.45] text-muted">You can switch anytime in Settings.</p>
          </div>
          <button type="button" onClick={() => choose('family')} className="press flex items-center gap-3.5 rounded-[22px] bg-surface p-4 text-left text-ink">
            <span className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-white" aria-hidden="true">
              <Soup size={22} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold">For my family</span>
                <span className="text-[11px] font-extrabold text-good">FREE</span>
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">Meal plans and a shopping list for your budget</span>
            </span>
            <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => choose('eatery')} className="press flex items-center gap-3.5 rounded-[22px] bg-ink p-4 text-left text-white">
            <span className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-white/10 text-brand" aria-hidden="true">
              <Store size={22} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold">For my eatery</span>
                <span className="text-[11px] font-extrabold text-brand">3 DISHES FREE</span>
              </span>
              <span className="mt-0.5 block text-[13px] text-on-dark-muted">Menu costs, kilos sold and today&apos;s profit</span>
            </span>
            <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <p className="mt-auto pt-2 text-center text-[12px] leading-[1.5] font-semibold text-muted">
            Kain keeps your plan, purchases and sales on this phone only. Save a backup anytime in Settings.
          </p>
        </div>
      </div>
    </Screen>
  );
}

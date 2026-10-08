'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { FeatureCheck } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { activateBusinessDemo, BUSINESS_DEMO } from '@/lib/eatery/business';
import { usePlanTier } from '@/lib/eatery/store';
import { useHydrated } from '@/lib/hydrated';
import { BackButton } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';

const FEATURES = [
  { title: 'Unlimited dish costing', sub: 'Free plan covers 3 dishes' },
  { title: 'Price spike alerts', sub: 'For the ingredients your menu uses' },
  { title: 'Cheaper substitutes', sub: 'Like bangus to tilapia in sinigang' },
  { title: 'Daily profit estimate', sub: 'From your menu and logged purchases' },
  { title: 'Menu cost trend and export', sub: 'Copy your costed menu to Sheets or Excel' },
];

/**
 * Business plan (KAIN_BUILD_PROMPT §5.8). No real payments in this build:
 * GCash and Maya are a choice only; the plan starts through a clearly
 * labelled demo activation.
 */
export function BusinessScreen() {
  const [pay, setPay] = useState<'GCash' | 'Maya'>('GCash');
  const [tier] = usePlanTier();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const active = hydrated && tier === 'business';

  const activate = async () => {
    setBusy(true);
    setNote(null);
    const res = await activateBusinessDemo();
    setBusy(false);
    if (res.ok) nav.dismiss('/eatery');
    else setNote(res.message);
  };

  return (
    <Screen presentation="sheet" label="Business plan" scrollClassName="bg-brand">
      <div className="flex min-h-full flex-col">
        <div className="flex h-[214px] flex-none flex-col px-5 pt-4">
          <BackButton fallback="/eatery" kind="sheet-down" label="Close" icon="close" tone="glass" />
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 pb-7">
            <Logo height={58} priority />
            <span className="rounded-full bg-ink px-3 py-[5px] text-[12px] font-extrabold tracking-[0.08em] text-brand uppercase">for Business</span>
          </div>
        </div>

        <div className="-mt-[18px] flex flex-1 flex-col gap-[18px] rounded-t-[28px] bg-white px-5 pt-[26px] pb-[calc(28px+var(--safe-bottom))]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] leading-[1.2] font-extrabold tracking-[-0.02em]">Protect your margins when market prices move</h1>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-extrabold tracking-[-0.02em]">₱199</span>
              <span className="text-[15px] font-bold text-muted">per month</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {FEATURES.map((f) => (
              <FeatureCheck key={f.title} {...f} />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {active ? (
              <>
                <div role="status" className="flex items-center gap-2 rounded-[16px] bg-good-bg px-3.5 py-3 text-[14px] font-bold text-good">
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                  You&apos;re on the Business plan.
                </div>
                <Button onClick={() => nav.dismiss('/eatery')}>Back to my eatery</Button>
              </>
            ) : (
              <>
                <div id="pay-with" className="text-[13px] font-bold text-muted">
                  Pay with
                </div>
                <div role="radiogroup" aria-labelledby="pay-with" className="grid grid-cols-2 gap-2">
                  {(['GCash', 'Maya'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={pay === p}
                      onClick={() => setPay(p)}
                      className={cn('press h-12 rounded-[14px] bg-white text-[15px] font-extrabold text-ink', pay === p ? 'border-2 border-ink' : 'border border-line')}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {note ? (
                  <p role="status" className="rounded-[14px] bg-warn-bg px-3.5 py-2.5 text-[13px] leading-[1.45] font-semibold text-warn">
                    {note}
                  </p>
                ) : null}
                <Button className="mt-1.5" onClick={() => setNote(`${pay} payments aren't set up yet, so nothing is charged in this version.`)}>
                  Start Business plan
                </Button>
                {BUSINESS_DEMO ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void activate()}
                    className="press hit h-11 rounded-[14px] border border-dashed border-tier-est-border text-[14px] font-bold text-ink disabled:opacity-60"
                  >
                    {busy ? 'Starting…' : 'Demo: activate without payment'}
                  </button>
                ) : null}
                <div className="text-center text-[12px] font-semibold text-muted">Cancel anytime. Families always use Kain free.</div>
              </>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}

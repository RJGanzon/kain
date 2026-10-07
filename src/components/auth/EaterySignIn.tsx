'use client';

import { Store } from 'lucide-react';
import { useState } from 'react';
import { IconTile } from '@/components/ui/bits';
import { signInWith, type Provider } from '@/lib/auth/providers';
import { NavLink } from '@/lib/nav/links';
import { ProviderButtons } from './ProviderButtons';

/** Eatery features need an account (KAIN_BUILD_PROMPT §8): the menu, pots and sales are saved to it. */
export function EaterySignIn() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4 rounded-[24px] bg-surface p-5">
      <IconTile size={48} className="bg-white">
        <Store size={22} strokeWidth={2} />
      </IconTile>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Sign in to run your eatery</h2>
        <p className="text-[14px] leading-[1.45] text-muted">
          Your menu costs, pots and today&apos;s profit are saved to your account, so they&apos;re safe if you change phones. The free plan
          covers 3 dishes.
        </p>
      </div>
      {problem ? (
        <p role="alert" className="rounded-[14px] bg-warn-bg px-3.5 py-2.5 text-[13px] leading-[1.45] font-semibold text-warn">
          {problem}
        </p>
      ) : null}
      <ProviderButtons
        busy={busy}
        onPick={async (p) => {
          setProblem(null);
          setBusy(p);
          const res = await signInWith(p);
          if (!res.ok) {
            setProblem(res.message);
            setBusy(null);
          }
        }}
      />
      <p className="text-[13px] leading-[1.45] text-muted">
        Planning meals for your family?{' '}
        <NavLink href="/plan" kind="tab" replace className="font-bold text-ink underline underline-offset-3">
          That&apos;s free without an account
        </NavLink>
        .
      </p>
    </div>
  );
}

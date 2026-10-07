'use client';

import { LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { saveRole, signOut, type Role } from '@/lib/auth/account';
import { useSession } from '@/lib/auth/session';
import { useHydrated } from '@/lib/hydrated';
import { NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { useDeviceState } from '@/lib/store/device';
import { backendConfigured } from '@/lib/supabase/client';

/** Settings → Account: sign in, switch family/eatery, sign out. */
export function AccountSection() {
  const hydrated = useHydrated();
  const { ready, session } = useSession();
  const [role] = useDeviceState<Role | null>('kain:role', null);
  const [problem, setProblem] = useState<string | null>(null);
  if (!hydrated || !backendConfigured() || !ready) return null;

  if (!session) {
    return (
      <section aria-labelledby="account-title" className="flex flex-col gap-2.5 rounded-[20px] border border-line p-4">
        <h2 id="account-title" className="text-[15px] font-extrabold">
          Account
        </h2>
        <p className="text-[13px] leading-[1.45] text-muted">
          You&apos;re planning without an account. Sign in to keep your plan and logs on all your phones, or to run an eatery.
        </p>
        <NavLink href="/signin" kind="forward" className="press hit self-start text-[14px] font-bold underline underline-offset-3">
          Sign in
        </NavLink>
      </section>
    );
  }

  const meta = session.user.user_metadata as { full_name?: string; name?: string };
  const who = meta.full_name ?? meta.name ?? session.user.email ?? 'Your account';

  return (
    <section aria-labelledby="account-title" className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-surface" aria-hidden="true">
          <UserRound size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="account-title" className="truncate text-[15px] font-extrabold">
            {who}
          </h2>
          {session.user.email && who !== session.user.email ? <div className="truncate text-[12px] text-muted">{session.user.email}</div> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] font-bold text-muted">Kain is for</div>
        <Segmented
          label="Kain is for"
          value={role ?? 'family'}
          onChange={(v) => void saveRole(v)}
          options={[
            { value: 'family', label: 'My family' },
            { value: 'eatery', label: 'My eatery' },
          ]}
        />
      </div>
      {problem ? (
        <p role="alert" className="text-[13px] font-semibold text-warn">
          {problem}
        </p>
      ) : null}
      <button
        type="button"
        onClick={async () => {
          setProblem(null);
          const res = await signOut();
          if (!res.ok) {
            setProblem(`${res.pending} change${res.pending === 1 ? " hasn't" : "s haven't"} reached your account yet. Try again in a moment.`);
            return;
          }
          nav.replace('/signin', 'fade');
        }}
        className="press hit flex items-center gap-1.5 self-start text-[14px] font-bold text-bad"
      >
        <LogOut size={16} strokeWidth={2.4} aria-hidden="true" />
        Sign out
      </button>
    </section>
  );
}

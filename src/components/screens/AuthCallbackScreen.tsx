'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { syncAccount } from '@/lib/auth/account';
import { sessionReady } from '@/lib/auth/session';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';

/**
 * Back from Google or Facebook. Supabase exchanges the code for a session
 * (PKCE) as it starts; this screen waits for that, brings the account onto
 * the phone, then goes to the role picker or straight to Plan or Eatery.
 */
export function AuthCallbackScreen() {
  const params = useSearchParams();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get('error_description') ?? params.get('error');
    if (err) {
      setProblem(err === 'access_denied' || /denied|cancel/i.test(err) ? 'Sign-in was cancelled.' : `Sign-in didn't finish: ${err}`);
      return;
    }
    let live = true;
    (async () => {
      const { session } = await sessionReady();
      if (!live) return;
      if (!session) {
        setProblem("Sign-in didn't finish. Please try again.");
        return;
      }
      let role: string | null = null;
      try {
        role = (await syncAccount())?.role ?? null;
      } catch {
        // Offline or the server is busy: carry on; the account syncs later.
      }
      if (!live) return;
      if (role === 'eatery') nav.replace('/eatery', 'forward');
      else if (role === 'family') nav.replace('/plan', 'forward');
      else nav.replace('/signin', 'fade');
    })();
    return () => {
      live = false;
    };
  }, [params]);

  return (
    <Screen presentation="full" label="Signing in" scrollClassName="bg-brand">
      <div className="flex min-h-full flex-col items-center justify-center gap-5 px-8 text-center">
        <Logo height={58} priority />
        {problem ? (
          <>
            <p className="text-[16px] leading-[1.45] font-bold" role="alert">
              {problem}
            </p>
            <Button onClick={() => nav.replace('/signin', 'fade')} className="max-w-xs">
              Back to sign in
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3" role="status">
            <div className="spinner size-6 rounded-full border-[3px] border-[rgba(20,18,16,0.2)] border-t-ink" aria-hidden="true" />
            <span className="text-[16px] font-bold">Signing you in…</span>
          </div>
        )}
      </div>
    </Screen>
  );
}

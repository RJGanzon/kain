'use client';

import { Check, ChevronRight, Soup, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { ProviderButtons } from '@/components/auth/ProviderButtons';
import { FeatureCheck } from '@/components/ui/bits';
import { Logo } from '@/components/ui/Logo';
import { saveRole, type Role } from '@/lib/auth/account';
import { PROVIDER_NAME, signInWith, type Provider } from '@/lib/auth/providers';
import { useSession } from '@/lib/auth/session';
import { NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';

type Step = 'signin' | 'connecting' | 'role';

const FEATURES = [
  { title: 'Meal plans that fit your budget', sub: 'Free for families, no account needed' },
  { title: "Today's market prices", sub: 'Dated, from your nearest market' },
  { title: 'Menu costing for eateries', sub: 'Kilos sold, what is left and today’s profit' },
];

function hasFamilySettings(): boolean {
  try {
    return localStorage.getItem('kain:family') !== null;
  } catch {
    return false;
  }
}

/**
 * Sign in → connecting → role picker (KAIN_BUILD_PROMPT §5.1, §8).
 * Google and Facebook through Supabase Auth (PKCE); families can skip it.
 */
export function SignInScreen() {
  const { ready, session } = useSession();
  const [step, setStep] = useState<Step>('signin');
  const [provider, setProvider] = useState<Provider>('google');
  const [problem, setProblem] = useState<string | null>(null);

  const go = (next: Step) => void runTransition('fade', () => flushSync(() => setStep(next)));

  // Signed in (back from the provider, or switching role in Settings): pick a role.
  useEffect(() => {
    if (!ready || !session) return;
    const p = (session.user.app_metadata as { provider?: string }).provider;
    if (p === 'google' || p === 'facebook') setProvider(p);
    if (step !== 'role') setStep('role');
  }, [ready, session, step]);

  // Back from the provider's page without finishing: show the buttons again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setStep((s) => (s === 'connecting' ? 'signin' : s));
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const start = async (p: Provider) => {
    setProblem(null);
    setProvider(p);
    go('connecting');
    const res = await signInWith(p);
    if (!res.ok) {
      setProblem(res.message);
      go('signin');
    }
  };

  const choose = async (role: Role) => {
    await saveRole(role);
    if (role === 'eatery') nav.replace('/eatery', 'forward');
    else if (hasFamilySettings()) nav.replace('/plan', 'forward');
    else nav.replace('/plan/setup', 'push-full');
  };

  const name = PROVIDER_NAME[provider];

  return (
    <Screen presentation="full" label="Sign in" scrollClassName="bg-brand">
      <div className="flex min-h-full flex-col">
        <div className="flex h-[330px] flex-none flex-col items-center justify-center gap-3 px-5 pt-4 pb-9">
          <Logo height={66} priority />
          <div className="text-[17px] font-extrabold tracking-[-0.01em]">More nutrition from every peso</div>
          <span className="rounded-full bg-ink px-3 py-[5px] text-[12px] font-extrabold tracking-[0.08em] text-brand uppercase">
            {step === 'role' ? 'Welcome' : 'Sign in'}
          </span>
        </div>

        <div className="-mt-5 flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pt-[26px] pb-[calc(28px+var(--safe-bottom))]">
          {step === 'signin' ? (
            <div className="flex flex-1 flex-col gap-[18px]">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em]">Sign in or create an account</h1>
                <p className="text-[14px] leading-[1.45] text-muted">One tap, no new password to remember.</p>
              </div>
              <div className="flex flex-col gap-3.5">
                {FEATURES.map((f) => (
                  <FeatureCheck key={f.title} {...f} />
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-2.5">
                {problem ? (
                  <p role="alert" className="rounded-[14px] bg-warn-bg px-3.5 py-2.5 text-[13px] leading-[1.45] font-semibold text-warn">
                    {problem}
                  </p>
                ) : null}
                <ProviderButtons onPick={(p) => void start(p)} />
                <NavLink
                  href="/plan/setup"
                  kind="push-full"
                  replace
                  className="hit mt-0.5 self-center text-[14px] font-bold underline underline-offset-3"
                >
                  Plan meals without an account
                </NavLink>
                <p className="mt-1 text-center text-[12px] leading-[1.5] font-semibold text-muted">
                  Kain only receives your name and email. By continuing you agree to the{' '}
                  <a href="#terms" className="font-bold text-ink underline">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" className="font-bold text-ink underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {step === 'connecting' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-5 pb-20 text-center" role="status">
              <div className="spinner size-11 rounded-full border-[3px] border-track border-t-ink" aria-hidden="true" />
              <div className="text-[20px] font-extrabold tracking-[-0.02em]">Connecting to {name}</div>
              <p className="text-[14px] leading-[1.5] text-muted">Finish signing in on the {name} page. You&apos;ll come straight back to Kain.</p>
              <button
                type="button"
                onClick={() => go('signin')}
                className="press mt-1.5 h-11 rounded-full border border-line bg-white px-[22px] text-[14px] font-bold text-ink"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {step === 'role' ? (
            <div className="flex flex-1 flex-col gap-3.5">
              <div className="flex flex-col gap-1.5 pb-1">
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-good-bg px-2.5 py-1 text-[12px] font-extrabold text-good">
                  <Check size={12} strokeWidth={3.2} aria-hidden="true" />
                  Signed in with {name}
                </span>
                <h1 className="mt-1 text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em]">How will you use Kain?</h1>
                <p className="text-[14px] leading-[1.45] text-muted">You can switch anytime in Settings.</p>
              </div>
              <button type="button" onClick={() => void choose('family')} className="press flex items-center gap-3.5 rounded-[22px] bg-surface p-4 text-left text-ink">
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
              <button type="button" onClick={() => void choose('eatery')} className="press flex items-center gap-3.5 rounded-[22px] bg-ink p-4 text-left text-white">
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
            </div>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}

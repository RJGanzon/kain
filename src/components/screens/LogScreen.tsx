'use client';

import { AlertTriangle, Check, Mic } from 'lucide-react';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { IngredientIcon } from '@/components/ui/IngredientIcon';
import { Meter } from '@/components/ui/Meter';
import { Pill } from '@/components/ui/Pill';
import { manilaToday, shortDate } from '@/components/ui/PriceLabels';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/data/catalog';
import type { PurchaseLog } from '@/lib/data/db';
import { peso } from '@/lib/format';
import { useHydrated } from '@/lib/hydrated';
import { addLog, referencePrice } from '@/lib/log/actions';
import { useSpeech } from '@/lib/log/speech';
import { useLogs } from '@/lib/log/store';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';
import { parseLog, qtyLabel } from '@/lib/parser/parse';
import { shortName } from '@/lib/planner/describe';
import { UNIT_LABEL } from '@/lib/planner/nutrition';
import { usePlan } from '@/lib/planner/usePlan';

const EXAMPLES = ['isang kilo kamatis 110', 'isang dosenang itlog 102', 'kalahating kilo galunggong 140', '3 lata sardinas 78'];
const WEEK = 7 * 24 * 60 * 60 * 1000;

function money(v: number): string {
  return Number.isInteger(Math.round(v * 100) / 100) ? peso(v) : `₱${v.toFixed(2)}`;
}

function whenLabel(ms: number): string {
  const today = manilaToday();
  const day = manilaToday(new Date(ms));
  if (day === today) return 'Today';
  if (day === manilaToday(new Date(Date.now() - 86_400_000))) return 'Yesterday';
  return shortDate(day, today);
}

export function LogScreen() {
  const catalog = useCatalog();
  const logs = useLogs();
  const planState = usePlan();
  const hydrated = useHydrated();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [added, setAdded] = useState<PurchaseLog | null>(null);
  const speech = useSpeech((t) => {
    setText(t);
    setSubmitted(false);
    setAdded(null);
  });

  const ingredients = useMemo(() => new Map(catalog.ingredients.map((i) => [i.id, i])), [catalog.ingredients]);
  const market = catalog.markets.find((m) => m.id === catalog.marketId);
  const parsed = text.trim() ? parseLog(text, catalog.ingredients) : null;
  const reference = parsed?.ok ? referencePrice(catalog.prices, parsed.ingredient.id) : null;
  const close = parsed?.ok && reference ? Math.abs(parsed.unitPrice / reference - 1) <= 0.3 : false;

  // This week: the plan's shopping for a week vs what was logged in the last 7 days.
  const plan = planState ? Math.round((planState.plan.shopTotal / planState.plan.days.length) * 7) : 0;
  const now = hydrated ? Date.now() : 0;
  const logged = logs.filter((l) => now - l.loggedAt <= WEEK).reduce((a, l) => a + l.totalPrice, 0);

  const submit = async () => {
    setSubmitted(true);
    if (!parsed?.ok) return;
    const log = await addLog(parsed, text.trim(), catalog.marketId, reference);
    void runTransition('fade', () =>
      flushSync(() => {
        setAdded(log);
        setText('');
        setSubmitted(false);
      }),
    );
  };

  const addedIng = added ? ingredients.get(added.ingredientId) : undefined;

  return (
    <Screen presentation="tab" label="Log a purchase" scrollKey="/log">
      <div className="flex flex-col gap-4 px-5 pt-6 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Log a purchase</h1>
          <p className="text-[14px] leading-[1.4] text-muted">Say it or type it. Each entry adds a dated price for your market.</p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[24px] bg-surface p-5">
          {speech.supported !== false ? (
            <button
              type="button"
              aria-label={speech.listening ? 'Stop listening' : 'Speak your purchase'}
              aria-pressed={speech.listening}
              disabled={speech.supported === null}
              onClick={speech.toggle}
              className={cn(
                'press flex size-24 items-center justify-center rounded-full bg-brand text-ink',
                speech.listening ? 'mic-listening' : 'shadow-float',
              )}
            >
              <Mic size={36} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
          <div className="text-center text-[14px] font-bold" aria-live="polite">
            {speech.supported === false
              ? 'Voice works in Chrome on Android. Typing works everywhere.'
              : speech.problem
                ? speech.problem
                : speech.listening
                  ? 'Listening… say item, amount and price'
                  : 'Tap and say “isang kilo kamatis 110”'}
          </div>
          <form
            className="flex h-12 w-full items-center gap-2 rounded-[14px] bg-white pr-1.5 pl-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label htmlFor="logText" className="sr-only">
              What you bought and how much you paid
            </label>
            <input
              id="logText"
              value={text}
              autoComplete="off"
              enterKeyHint="done"
              placeholder="isang kilo kamatis 110"
              onChange={(e) => {
                setText(e.target.value);
                setSubmitted(false);
                setAdded(null);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted"
            />
            <button type="submit" className="press hit h-9 rounded-[10px] bg-ink px-3.5 text-[14px] font-extrabold text-white">
              Add
            </button>
          </form>
        </div>

        <div aria-live="polite">
          {parsed?.ok ? (
            <div className="flex flex-col gap-2 rounded-[20px] border border-line px-4 py-3.5">
              <div className="flex items-center gap-3">
                <IngredientIcon category={parsed.ingredient.category} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold">
                    {shortName(parsed.ingredient.name)} · {qtyLabel(parsed.ingredient.unit, parsed.qty)}
                  </div>
                  <div className="text-[13px] text-muted">
                    {money(parsed.unitPrice)} per {UNIT_LABEL[parsed.ingredient.unit]}
                    {reference ? ` · market price ${money(reference)}` : ''}
                  </div>
                </div>
                <div className="text-[17px] font-extrabold">{peso(parsed.price)}</div>
              </div>
              {close ? (
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-good">
                  <Check size={14} strokeWidth={3} className="flex-none" aria-hidden="true" />
                  Close to market price. It will update {market?.name.replace(/ Market$/, '')}&apos;s{' '}
                  {shortName(parsed.ingredient.name).toLowerCase()} price.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-warn">
                  <AlertTriangle size={14} strokeWidth={2.6} className="flex-none" aria-hidden="true" />
                  Far from market price. It will be saved but not used.
                </div>
              )}
            </div>
          ) : parsed && !parsed.ok ? (
            <p className={cn('px-1 text-[14px] leading-[1.45] font-semibold', submitted ? 'text-bad' : 'text-muted')}>{parsed.message}</p>
          ) : added && addedIng ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-[18px] px-3.5 py-3 text-[14px] font-bold',
                added.status === 'accepted' ? 'bg-good-bg text-good' : 'bg-warn-bg text-warn',
              )}
            >
              {added.status === 'accepted' ? (
                <Check size={16} strokeWidth={3} className="flex-none" aria-hidden="true" />
              ) : (
                <AlertTriangle size={16} strokeWidth={2.6} className="flex-none" aria-hidden="true" />
              )}
              <span className="flex-1">
                {added.status === 'accepted'
                  ? `${shortName(addedIng.name)} price added for ${market?.name ?? 'your market'}.`
                  : `${shortName(addedIng.name)} saved. The price looks unusual, so it won't be used.`}
              </span>
            </div>
          ) : null}
        </div>

        <section aria-labelledby="week-title" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="week-title" className="text-[17px] font-extrabold">
              This week
            </h2>
            <div className="text-[12px] font-semibold text-muted">
              {plan ? (logged <= plan ? `${peso(plan - logged)} not logged yet` : `${peso(logged - plan)} over the plan`) : null}
            </div>
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2.5">
            <span className="text-[13px] font-bold">Plan</span>
            <Meter value={plan ? plan / Math.max(plan, logged) : 0} height={10} fillClassName="bg-brand" label={`Plan ${peso(plan)}`} />
            <span className="text-right text-[13px] font-extrabold">{plan ? peso(plan) : ''}</span>
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2.5">
            <span className="text-[13px] font-bold">Logged</span>
            <Meter value={plan ? logged / Math.max(plan, logged) : 0} height={10} label={`Logged ${peso(logged)}`} />
            <span className="text-right text-[13px] font-extrabold">{peso(logged)}</span>
          </div>
        </section>

        <section aria-labelledby="recent-title" className="flex flex-col">
          <h2 id="recent-title" className="pb-0.5 text-[17px] font-extrabold">
            Recent
          </h2>
          {logs.slice(0, 30).map((l) => {
            const ing = ingredients.get(l.ingredientId);
            if (!ing) return null;
            return (
              <div key={l.id} className="flex items-center gap-3 border-b border-line py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">
                    {shortName(ing.name)} · {qtyLabel(ing.unit, l.qty)}
                  </div>
                  <div className="text-[12px] text-muted">
                    {whenLabel(l.loggedAt)} · {money(l.unitPrice)} per {UNIT_LABEL[ing.unit]}
                  </div>
                </div>
                {l.status === 'accepted' ? (
                  <Pill tone="good" className="py-[3px]">
                    Price added
                  </Pill>
                ) : (
                  <Pill tone="warn" className="py-[3px]">
                    Unusual, not used
                  </Pill>
                )}
                <div className="w-12 text-right text-[15px] font-extrabold">{peso(l.totalPrice)}</div>
              </div>
            );
          })}
          {hydrated && logs.length === 0 ? (
            <div className="flex flex-col gap-2.5 py-3">
              <p className="text-[14px] leading-[1.45] text-muted">Nothing logged yet. Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setText(ex);
                      setAdded(null);
                      document.getElementById('logText')?.focus();
                    }}
                    className="press hit h-9 rounded-full border border-line bg-white px-3.5 text-[13px] font-bold text-ink"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="pt-3 text-[12px] leading-[1.5] text-muted">
            Prices more than 30% away from the market price are kept but not used, so one typo can&apos;t move everyone&apos;s prices.
          </p>
        </section>
      </div>
    </Screen>
  );
}

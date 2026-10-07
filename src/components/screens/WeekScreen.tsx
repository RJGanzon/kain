'use client';

import { Check } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Meter } from '@/components/ui/Meter';
import { manilaToday, shortDate, TIER_LABEL } from '@/components/ui/PriceLabels';
import { Skeleton } from '@/components/ui/Skeleton';
import { SourceNote } from '@/components/ui/SourceNote';
import { cn } from '@/lib/cn';
import { peso } from '@/lib/format';
import { BackButton } from '@/lib/nav/links';
import { Screen } from '@/lib/nav/Screen';
import { CATEGORY_LABEL, CATEGORY_ORDER, planWeekdays, shortName } from '@/lib/planner/describe';
import { NUTRIENTS } from '@/lib/planner/nutrition';
import { cheapestDayCost, type ShopItem } from '@/lib/planner/planner';
import { usePlan } from '@/lib/planner/usePlan';
import { useDeviceState } from '@/lib/store/device';

/** Bar colour: 90% and up good, 60–89% warn, below 60% bad. */
function barColor(v: number): string {
  return v >= 0.9 ? 'var(--good-bar)' : v >= 0.6 ? 'var(--warn-bar)' : 'var(--bad-bar)';
}

/** "650 g · Estimated price, Oct 5" */
function itemMeta(s: ShopItem, today: string): string {
  const source = s.price.tier === 'estimate' ? 'Estimated price' : `${TIER_LABEL[s.price.tier]} price`;
  const extra = s.leftOver ? ` · ${s.leftOver} left over` : '';
  return `${s.label}${extra} · ${source}, ${shortDate(s.price.observedAt, today)}`;
}

export function WeekScreen() {
  const state = usePlan();
  const plan = state?.plan;
  const [day, setDay] = useState(0);
  // The card shows the daily average until a day is tapped; tapping the
  // shown day again goes back to the average.
  const [dayFocus, setDayFocus] = useState(false);
  const [ticked, setTicked] = useDeviceState<string[]>('kain:shop-ticked', []);
  // Draw the first rows with the screen and the rest once the phone is idle,
  // so the slide-in starts sooner (the list runs below the fold anyway).
  const [allRows, setAllRows] = useState(false);
  useEffect(() => {
    if (allRows || !plan) return;
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setAllRows(true), { timeout: 600 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setAllRows(true), 300);
    return () => clearTimeout(id);
  }, [allRows, plan]);
  const weekdays = useMemo(() => planWeekdays(plan?.days.length ?? 7), [plan?.days.length]);
  const today = manilaToday();

  const shown = plan ? (dayFocus ? plan.days[Math.min(day, plan.days.length - 1)].coverage : plan.average) : null;
  const animalDays = plan ? plan.days.filter((d) => d.animalDay).length : 0;
  const leftPerDay = plan && state ? state.family.budget - plan.total / plan.days.length : 0;
  const over = plan?.days.some((d) => d.over) ?? false;
  const groups: Array<{ cat: (typeof CATEGORY_ORDER)[number]; items: ShopItem[] }> = [];
  let budgetRows = allRows ? Infinity : 8;
  for (const cat of CATEGORY_ORDER) {
    if (!plan || budgetRows <= 0) break;
    const items = plan.shop
      .filter((s) => s.category === cat)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, budgetRows);
    budgetRows -= items.length;
    if (items.length) groups.push({ cat, items });
  }

  const pickDay = (i: number) => {
    if (i === day && dayFocus) setDayFocus(false);
    else {
      setDay(i);
      setDayFocus(true);
    }
  };
  const toggle = (id: string) => setTicked(ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id]);

  return (
    <Screen presentation="stack" label="This week" backFallback="/plan">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        <header className="flex h-11 items-center justify-between">
          <BackButton fallback="/plan" />
          <div className="text-center">
            <h1 className="text-[15px] font-extrabold">{plan && plan.days.length === 1 ? 'Today' : 'This week'}</h1>
            <div className="min-h-[15px] text-[12px] font-semibold text-muted">
              {plan ? `${peso(plan.total)} of ${peso(plan.budgetTotal)}` : null}
            </div>
          </div>
          <div className="w-11" />
        </header>

        <div role="radiogroup" aria-label="Day" aria-busy={!plan} className="grid grid-cols-7 gap-1.5">
          {(plan?.days ?? Array.from({ length: 7 }, () => null)).map((d, i) => {
            const on = !!d && i === day;
            const label = weekdays[i];
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!d}
                aria-label={d ? `${label.long}, ${peso(d.cost)}` : undefined}
                onClick={() => pickDay(i)}
                className={cn(
                  'press flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[16px] p-0 text-ink',
                  on ? 'bg-brand' : 'border border-line bg-white',
                  d?.over && !on && 'border-bad-bar',
                )}
              >
                <span className={cn('text-[11px] font-bold', on ? 'text-on-brand' : 'text-muted')}>{label?.short}</span>
                {d ? <span className="text-[13px] font-extrabold">{peso(d.cost)}</span> : <Skeleton className="h-3 w-8" />}
              </button>
            );
          })}
        </div>

        {plan && over ? (
          <div role="alert" className="rounded-[18px] bg-bad-bg px-3.5 py-3 text-[14px] leading-[1.45] font-semibold text-bad">
            <b className="font-extrabold">Budget too small.</b> The cheapest plan costs {peso(cheapestDayCost(plan))} a day.
          </div>
        ) : null}

        <section aria-labelledby="nutrition-title" className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="nutrition-title" className="text-[17px] font-extrabold">
              Nutrition covered
            </h2>
            <div className="text-[12px] font-semibold text-muted" aria-live="polite">
              {dayFocus && plan ? weekdays[day]?.long : 'daily average'} vs FNRI needs
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {NUTRIENTS.map((n, k) => {
              const v = shown?.[k] ?? 0;
              return (
                <div key={n.key} className="grid grid-cols-[82px_minmax(0,1fr)_46px] items-center gap-2.5">
                  <span className="text-[13px] font-bold">{n.label}</span>
                  <Meter value={v} height={10} fillColor={shown ? barColor(v) : undefined} label={shown ? `${n.label} ${Math.round(v * 100)}%` : undefined} />
                  <span className="text-right text-[13px] font-extrabold">{shown ? (v >= 1 ? '100%+' : `${Math.round(v * 100)}%`) : ''}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] bg-good-bg px-3.5 py-3">
            <div className="min-h-[28px] text-[22px] font-extrabold text-good">{plan ? `${animalDays} of ${plan.days.length}` : ''}</div>
            <div className="text-[12px] font-semibold text-good">{plan?.days.length === 1 ? 'today' : 'days'} with fish, meat or eggs</div>
          </div>
          <div className="rounded-[18px] bg-brand-tint px-3.5 py-3">
            <div className="min-h-[28px] text-[22px] font-extrabold">{plan ? peso(Math.max(0, leftPerDay)) : ''}</div>
            <div className="text-[12px] font-semibold text-on-brand">a day left for coffee or snacks</div>
          </div>
        </div>

        <section aria-labelledby="shop-title" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2 pb-1">
            <h2 id="shop-title" className="flex items-center gap-2 text-[17px] font-extrabold">
              Shopping list {state ? <SourceNote catalog={state.catalog} /> : null}
            </h2>
            <div className="text-[14px] font-bold whitespace-nowrap">{plan ? `All ${plan.shop.length} · ${peso(plan.shopTotal)}` : null}</div>
          </div>
          {groups.map(({ cat, items }) => (
            <Fragment key={cat}>
              <div className="pt-3 pb-1 text-[11px] font-bold tracking-[0.06em] text-muted uppercase">{CATEGORY_LABEL[cat]}</div>
              {items.map((s) => {
                const on = ticked.includes(s.ingredientId);
                return (
                  <button
                    key={s.ingredientId}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(s.ingredientId)}
                    className="flex w-full items-center gap-3 border-b border-line py-2.5 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-6 flex-none items-center justify-center rounded-[8px] border-2 transition-colors duration-150',
                        on ? 'border-ink bg-ink text-white' : 'border-check-border',
                      )}
                    >
                      {on ? <Check size={14} strokeWidth={3} className="tick-in" /> : null}
                    </span>
                    <span className={cn('min-w-0 flex-1 transition-opacity duration-150', on && 'opacity-50')}>
                      <span className={cn('block text-[15px] font-bold', on && 'line-through')}>{shortName(s.name)}</span>
                      <span className="block text-[12px] text-muted">{itemMeta(s, today)}</span>
                    </span>
                    <span className={cn('text-[15px] font-extrabold', on && 'opacity-50')}>{peso(s.cost)}</span>
                  </button>
                );
              })}
            </Fragment>
          ))}
          {plan ? (
            <p className="pt-3 text-[12px] leading-[1.5] text-muted">
              Vegetables, fish and meat are rounded up to 50 g. Oil, toyo, suka and patis are bought as tingi. Eggs, cans and tali come whole,
              so some may be left over.
            </p>
          ) : null}
        </section>
      </div>
    </Screen>
  );
}

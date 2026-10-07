'use client';

import { Check } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Meter } from '@/components/ui/Meter';
import { SampleBadge } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { peso } from '@/lib/format';
import { BackButton } from '@/lib/nav/links';
import { Screen } from '@/lib/nav/Screen';
import { SAMPLE_PLAN, SAMPLE_WEEKDAYS, TIER_LABEL, type Tier } from '@/lib/sample/plan';
import { useDeviceState } from '@/lib/store/device';

const WEEKDAY_NAMES: Record<string, string> = {
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
};

/** Where a shopping-list price comes from. */
function sourceLabel(tier: string): string {
  return tier === 'estimate' ? 'Estimated price' : `${TIER_LABEL[tier as Tier]} price`;
}

/** Bar colour: 90% and up good, 60–89% warn, below 60% bad. */
function barColor(v: number): string {
  return v >= 0.9 ? 'var(--good-bar)' : v >= 0.6 ? 'var(--warn-bar)' : 'var(--bad-bar)';
}

export function WeekScreen() {
  const plan = SAMPLE_PLAN;
  const [day, setDay] = useState(0);
  // The card shows the week's daily average until a day is tapped; tapping
  // the shown day again goes back to the average.
  const [dayFocus, setDayFocus] = useState(false);
  const [ticked, setTicked] = useDeviceState<string[]>('kain:shop-ticked', []);
  const coverage = dayFocus ? plan.days[day].coverage : plan.average;
  const pickDay = (i: number) => {
    if (i === day && dayFocus) setDayFocus(false);
    else {
      setDay(i);
      setDayFocus(true);
    }
  };
  const animalDays = plan.days.filter((d) => d.animalDay).length;
  const leftPerDay = plan.inputs.budget - plan.weekCost / plan.days.length;
  const categories = [...new Set(plan.shop.map((s) => s.category))];

  const toggle = (id: string) => setTicked(ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id]);

  return (
    <Screen presentation="stack" label="This week" backFallback="/plan">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        <header className="flex h-11 items-center justify-between">
          <BackButton fallback="/plan" />
          <div className="text-center">
            <h1 className="text-[15px] font-extrabold">This week</h1>
            <div className="text-[12px] font-semibold text-muted">
              {peso(plan.weekCost)} of {peso(plan.budgetTotal)}
            </div>
          </div>
          <div className="w-11" />
        </header>

        <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 gap-1.5">
          {plan.days.map((d, i) => {
            const on = i === day;
            const label = SAMPLE_WEEKDAYS[i];
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${WEEKDAY_NAMES[label]}, ${peso(d.cost)}`}
                onClick={() => pickDay(i)}
                className={cn(
                  'press flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[16px] p-0 text-ink',
                  on ? 'bg-brand' : 'border border-line bg-white',
                )}
              >
                <span className={cn('text-[11px] font-bold', on ? 'text-on-brand' : 'text-muted')}>{label}</span>
                <span className="text-[13px] font-extrabold">{peso(d.cost)}</span>
              </button>
            );
          })}
        </div>

        <section aria-labelledby="nutrition-title" className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="nutrition-title" className="text-[17px] font-extrabold">
              Nutrition covered
            </h2>
            <div className="text-[12px] font-semibold text-muted" aria-live="polite">
              {dayFocus ? WEEKDAY_NAMES[SAMPLE_WEEKDAYS[day]] : 'daily average'} vs FNRI needs
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {plan.nutrients.map((label, k) => {
              const v = coverage[k];
              return (
                <div key={label} className="grid grid-cols-[82px_minmax(0,1fr)_46px] items-center gap-2.5">
                  <span className="text-[13px] font-bold">{label}</span>
                  <Meter value={v} height={10} fillColor={barColor(v)} label={`${label} ${Math.round(v * 100)}%`} />
                  <span className="text-right text-[13px] font-extrabold">{v >= 1 ? '100%+' : `${Math.round(v * 100)}%`}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] bg-good-bg px-3.5 py-3">
            <div className="text-[22px] font-extrabold text-good">
              {animalDays} of {plan.days.length}
            </div>
            <div className="text-[12px] font-semibold text-good">days with fish, meat or eggs</div>
          </div>
          <div className="rounded-[18px] bg-brand-tint px-3.5 py-3">
            <div className="text-[22px] font-extrabold">{peso(leftPerDay)}</div>
            <div className="text-[12px] font-semibold text-on-brand">a day left for coffee or snacks</div>
          </div>
        </div>

        <section aria-labelledby="shop-title" className="flex flex-col">
          <div className="flex items-baseline justify-between pb-1">
            <h2 id="shop-title" className="flex items-center gap-2 text-[17px] font-extrabold">
              Shopping list <SampleBadge />
            </h2>
            <div className="text-[14px] font-bold">
              All {plan.shop.length} · {peso(plan.shopTotal)}
            </div>
          </div>
          {categories.map((cat) => (
            <Fragment key={cat}>
              <div className="pt-3 pb-1 text-[11px] font-bold tracking-[0.06em] text-muted uppercase">{cat}</div>
              {plan.shop
                .filter((s) => s.category === cat)
                .map((s) => {
                  const on = ticked.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(s.id)}
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
                        <span className={cn('block text-[15px] font-bold', on && 'line-through')}>{s.name}</span>
                        <span className="block text-[12px] text-muted">
                          {s.qty}
                          {s.leftOver ? ` · ${s.leftOver} left over` : ''} · {sourceLabel(s.tier)}
                        </span>
                      </span>
                      <span className={cn('text-[15px] font-extrabold', on && 'opacity-50')}>{peso(s.cost)}</span>
                    </button>
                  );
                })}
            </Fragment>
          ))}
        </section>
      </div>
    </Screen>
  );
}

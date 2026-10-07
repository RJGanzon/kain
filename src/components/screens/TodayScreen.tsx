'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, MapPin, Moon, ShoppingBag, SlidersHorizontal, Sun, Sunrise } from 'lucide-react';
import { Suspense, useCallback, type ReactNode } from 'react';
import { IconTile, Overline } from '@/components/ui/bits';
import { iconButtonClass } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { Meter, NutritionRing } from '@/components/ui/Meter';
import { SampleBadge } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { peso } from '@/lib/format';
import { NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { Sheet } from '@/lib/nav/Sheet';
import { nutritionScore, SAMPLE_MARKETS, SAMPLE_PLAN, SAMPLE_TODAY_LABEL, type MealSlot } from '@/lib/sample/plan';
import { useMarket } from '@/lib/store/device';

const MEAL_ROWS: Array<{ slot: MealSlot; label: string; tile: string; icon: ReactNode }> = [
  { slot: 'almusal', label: 'Almusal', tile: 'bg-brand-tint', icon: <Sunrise size={22} strokeWidth={2} /> },
  { slot: 'tanghalian', label: 'Tanghalian', tile: 'bg-good-bg', icon: <Sun size={22} strokeWidth={2} /> },
  { slot: 'hapunan', label: 'Hapunan', tile: 'bg-tile-night', icon: <Moon size={22} strokeWidth={2} /> },
];

export function TodayScreen() {
  const plan = SAMPLE_PLAN;
  const today = plan.days[0];
  const { budget, adults, kids } = plan.inputs;
  const [marketId] = useMarket();
  const market = SAMPLE_MARKETS.find((m) => m.id === marketId) ?? SAMPLE_MARKETS[0];

  return (
    <Screen presentation="tab" label="Today's plan" scrollKey="/plan">
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6">
        <header className="flex h-11 items-center gap-2.5">
          <Logo height={28} priority />
          <div className="flex-1" />
          <NavLink
            href="/plan?sheet=market"
            kind="sheet-up"
            aria-label={`Change market, now ${market.name}`}
            className="press hit flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-bold no-underline"
          >
            <MapPin size={15} strokeWidth={2.2} aria-hidden="true" />
            {market.name}
            <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
          </NavLink>
          <NavLink href="/plan/setup" kind="push-full" aria-label="Edit budget and family" className={iconButtonClass()}>
            <SlidersHorizontal size={20} strokeWidth={2.2} aria-hidden="true" />
          </NavLink>
        </header>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            {SAMPLE_TODAY_LABEL}
            <SampleBadge />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Today&apos;s plan</h1>
        </div>

        <section aria-label="Plan cost today" className="flex items-center gap-4 rounded-[24px] bg-brand p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="text-[13px] font-bold text-on-brand">Plan cost today</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{peso(today.cost)}</span>
              <span className="text-[15px] font-bold text-on-brand">of {peso(budget)}</span>
            </div>
            <Meter
              value={today.cost / budget}
              height={8}
              trackClassName="bg-[rgba(20,18,16,0.14)]"
              label={`${Math.round((today.cost / budget) * 100)}% of today's budget`}
            />
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold">{peso(budget - today.cost)} left</span>
              <span className="rounded-full bg-white/55 px-2.5 py-1 text-[12px] font-bold">
                {adults} adults · {kids} kids
              </span>
            </div>
          </div>
          <NutritionRing value={nutritionScore(plan.average)} />
        </section>

        <section aria-labelledby="meals-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 id="meals-title" className="text-[18px] font-extrabold">
                Meals
              </h2>
              <div className="text-[13px] font-semibold text-muted">
                Day 1 of {plan.days.length} · for {plan.servings} servings
              </div>
            </div>
            <NavLink href="/plan/week" kind="push" className="hit text-[14px] font-bold underline underline-offset-3">
              See week
            </NavLink>
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line">
            {MEAL_ROWS.map(({ slot, label, tile, icon }, i) => {
              const meal = today.meals[slot];
              return (
                <div key={slot}>
                  {i > 0 ? <div className="ml-[78px] h-px bg-line" /> : null}
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <IconTile className={tile}>{icon}</IconTile>
                    <div className="min-w-0 flex-1">
                      <Overline>{label}</Overline>
                      <div className="text-[16px] font-bold">{meal.name}</div>
                      <div className="text-[13px] text-muted">{meal.ingredients}</div>
                    </div>
                    <div className="text-[15px] font-extrabold">{peso(meal.cost)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <NavLink
          href="/plan/week"
          kind="push"
          className="press flex items-center gap-3.5 rounded-[20px] bg-surface px-4 py-3.5 text-ink no-underline"
        >
          <IconTile size={44} className="bg-white">
            <ShoppingBag size={20} strokeWidth={2.2} />
          </IconTile>
          <div className="flex-1">
            <div className="text-[15px] font-bold">Shopping list</div>
            <div className="text-[13px] text-muted">
              {plan.shop.length} items for {plan.days.length} days · {peso(plan.shopTotal)}
            </div>
          </div>
          <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </NavLink>
      </div>

      <Suspense fallback={null}>
        <MarketSheet />
      </Suspense>
    </Screen>
  );
}

/** Market picker, open while the URL has ?sheet=market (so Back closes it). */
function MarketSheet() {
  const open = useSearchParams().get('sheet') === 'market';
  const pathname = usePathname();
  const [marketId, setMarket] = useMarket();
  const close = useCallback((opts?: { animate?: boolean }) => nav.dismiss(pathname, opts), [pathname]);

  return (
    <Sheet open={open} title="Choose your market" onClose={close}>
      <p className="-mt-1 pb-3 text-[14px] leading-[1.45] text-muted">Prices and plans use the market you shop at.</p>
      <div role="radiogroup" aria-label="Markets" className="flex flex-col">
        {SAMPLE_MARKETS.map((m) => {
          const on = m.id === marketId;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setMarket(m.id);
                close();
              }}
              className="press flex min-h-14 items-center gap-3 border-b border-line py-2.5 text-left last:border-b-0"
            >
              <MapPin size={20} strokeWidth={2.2} className={cn(on ? 'text-ink' : 'text-muted')} aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-[16px] font-bold">{m.name}</span>
                <span className="block text-[13px] text-muted">{m.city}</span>
              </span>
              {on ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-ink text-white">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

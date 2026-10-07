'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, MapPin, Moon, ShoppingBag, SlidersHorizontal, Sun, Sunrise } from 'lucide-react';
import { Suspense, useCallback, useMemo, type ReactNode } from 'react';
import { IconTile, Overline } from '@/components/ui/bits';
import { iconButtonClass } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { Meter, NutritionRing } from '@/components/ui/Meter';
import { Skeleton } from '@/components/ui/Skeleton';
import { SourceNote } from '@/components/ui/SourceNote';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/data/catalog';
import { peso } from '@/lib/format';
import { useHydrated } from '@/lib/hydrated';
import { NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { Sheet } from '@/lib/nav/Sheet';
import { familyLabel, longDate, mealIngredients, servingsLabel } from '@/lib/planner/describe';
import { cheapestDayCost, planScore } from '@/lib/planner/planner';
import { usePlan } from '@/lib/planner/usePlan';
import { useMarket } from '@/lib/store/device';

type Slot = 'breakfast' | 'lunch' | 'dinner';

const MEAL_ROWS: Array<{ slot: Slot; label: string; tile: string; icon: ReactNode }> = [
  { slot: 'breakfast', label: 'Almusal', tile: 'bg-brand-tint', icon: <Sunrise size={22} strokeWidth={2} /> },
  { slot: 'lunch', label: 'Tanghalian', tile: 'bg-good-bg', icon: <Sun size={22} strokeWidth={2} /> },
  { slot: 'dinner', label: 'Hapunan', tile: 'bg-tile-night', icon: <Moon size={22} strokeWidth={2} /> },
];

export function TodayScreen() {
  const state = usePlan();
  const catalog = useCatalog();
  const hydrated = useHydrated();
  const market = catalog.markets.find((m) => m.id === catalog.marketId) ?? catalog.markets[0];
  const ingredients = useMemo(() => new Map(catalog.ingredients.map((i) => [i.id, i])), [catalog.ingredients]);
  const recipes = useMemo(() => new Map(catalog.recipes.map((r) => [r.id, r])), [catalog.recipes]);

  const plan = state?.plan;
  const today = plan?.days[0];
  const budget = state?.family.budget ?? 0;
  const over = plan?.days.some((d) => d.over) ?? false;
  const left = today ? budget - today.cost : 0;

  return (
    <Screen presentation="tab" label="Today's plan" scrollKey="/plan">
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6">
        <header className="flex h-11 items-center gap-2.5">
          <Logo height={28} priority />
          <div className="flex-1" />
          <NavLink
            href="/plan?sheet=market"
            kind="sheet-up"
            aria-label={`Change market, now ${market?.name ?? ''}`}
            className="press hit flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-bold no-underline"
          >
            <MapPin size={15} strokeWidth={2.2} className="flex-none" aria-hidden="true" />
            <span className="truncate">{market?.name}</span>
            <ChevronDown size={14} strokeWidth={2.4} className="flex-none" aria-hidden="true" />
          </NavLink>
          <NavLink href="/plan/setup" kind="push-full" aria-label="Edit budget and family" className={iconButtonClass()}>
            <SlidersHorizontal size={20} strokeWidth={2.2} aria-hidden="true" />
          </NavLink>
        </header>

        <div className="flex flex-col gap-0.5">
          <div className="flex min-h-[17px] flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
            {hydrated ? longDate() : <Skeleton className="h-3 w-32" />}
            <SourceNote catalog={catalog} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Today&apos;s plan</h1>
        </div>

        <section aria-label="Plan cost today" aria-busy={!plan} className="flex items-center gap-4 rounded-[24px] bg-brand p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="text-[13px] font-bold text-on-brand">Plan cost today</div>
            <div className="flex min-h-10 items-baseline gap-1.5">
              {today ? (
                <>
                  <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{peso(today.cost)}</span>
                  <span className="text-[15px] font-bold text-on-brand">of {peso(budget)}</span>
                </>
              ) : (
                <Skeleton dark className="h-10 w-36" />
              )}
            </div>
            <Meter
              value={today ? today.cost / budget : 0}
              height={8}
              trackClassName="bg-[rgba(20,18,16,0.14)]"
              label={today ? `${Math.round((today.cost / budget) * 100)}% of today's budget` : undefined}
            />
            <div className="flex min-h-[24px] flex-wrap gap-1.5">
              {today && state ? (
                <>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold">
                    {left >= 0 ? `${peso(left)} left` : `${peso(-left)} over`}
                  </span>
                  <span className="rounded-full bg-white/55 px-2.5 py-1 text-[12px] font-bold">
                    {familyLabel(state.family.adults, state.family.kids)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <NutritionRing value={plan ? planScore(plan) : 0} />
        </section>

        {plan && over ? (
          <div role="alert" className="rounded-[18px] bg-bad-bg px-3.5 py-3 text-[14px] leading-[1.45] font-semibold text-bad">
            <b className="font-extrabold">Budget too small.</b> The cheapest plan costs {peso(cheapestDayCost(plan))} a day.
          </div>
        ) : null}

        <section aria-labelledby="meals-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 id="meals-title" className="text-[18px] font-extrabold">
                Meals
              </h2>
              <div className="min-h-[17px] text-[13px] font-semibold text-muted">
                {plan
                  ? `${plan.days.length > 1 ? `Day 1 of ${plan.days.length}` : 'Today'} · for ${servingsLabel(plan.servings)} servings`
                  : null}
              </div>
            </div>
            <NavLink href="/plan/week" kind="push" className="hit text-[14px] font-bold underline underline-offset-3">
              See week
            </NavLink>
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line">
            {MEAL_ROWS.map(({ slot, label, tile, icon }, i) => {
              const recipe = today ? recipes.get(today[slot]) : undefined;
              const cost = recipe && plan ? plan.dishes[recipe.id].cost * plan.servings : 0;
              return (
                <div key={slot}>
                  {i > 0 ? <div className="ml-[78px] h-px bg-line" /> : null}
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <IconTile className={tile}>{icon}</IconTile>
                    <div className="min-w-0 flex-1">
                      <Overline>{label}</Overline>
                      {recipe ? (
                        <>
                          <div className="text-[16px] font-bold">{recipe.name}</div>
                          <div className="text-[13px] text-muted">{mealIngredients(recipe, ingredients)}</div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1.5 py-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      )}
                    </div>
                    <div className={cn('text-[15px] font-extrabold', !recipe && 'invisible')}>{peso(cost)}</div>
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
            <div className="min-h-[17px] text-[13px] text-muted">
              {plan ? `${plan.shop.length} items for ${plan.days.length > 1 ? `${plan.days.length} days` : 'today'} · ${peso(plan.shopTotal)}` : null}
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
  const catalog = useCatalog();
  const [marketId, setMarket] = useMarket();
  const close = useCallback((opts?: { animate?: boolean }) => nav.dismiss(pathname, opts), [pathname]);

  return (
    <Sheet open={open} title="Choose your market" onClose={close}>
      <p className="-mt-1 pb-3 text-[14px] leading-[1.45] text-muted">Prices and plans use the market you shop at.</p>
      <div role="radiogroup" aria-label="Markets" className="flex flex-col">
        {catalog.markets.map((m) => {
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

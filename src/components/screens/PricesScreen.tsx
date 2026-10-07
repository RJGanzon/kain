'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Pill } from '@/components/ui/Pill';
import { changeOf, manilaToday, shortDate, TierPill } from '@/components/ui/PriceLabels';
import { SourceNote } from '@/components/ui/SourceNote';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/data/catalog';
import type { Category, Ingredient } from '@/lib/data/types';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';
import { perUnit } from '@/lib/planner/nutrition';
import { usePrices } from '@/lib/log/prices';

const FILTERS = ['All', 'Fish', 'Meat', 'Vegetables', 'Pantry'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_OF: Record<Category, Exclude<Filter, 'All'>> = {
  fish: 'Fish',
  meat: 'Meat',
  veg: 'Vegetables',
  spice: 'Vegetables',
  staple: 'Pantry',
  egg: 'Pantry',
  legume: 'Pantry',
  canned: 'Pantry',
  pantry: 'Pantry',
};

/** What people check most, first (the design's order); the rest A to Z. */
const FEATURED = ['kamatis', 'sibuyas', 'galunggong', 'bangus', 'kangkong', 'kalabasa', 'manok', 'atay', 'tilapia', 'mantika', 'toyo'];

function order(a: Ingredient, b: Ingredient): number {
  const fa = FEATURED.indexOf(a.id);
  const fb = FEATURED.indexOf(b.id);
  if (fa !== -1 || fb !== -1) return (fa === -1 ? 99 : fa) - (fb === -1 ? 99 : fb);
  return a.name.localeCompare(b.name);
}

function shortName(name: string): string {
  return name.replace(/ \(.*\)/, '');
}

function money(v: number): string {
  return Number.isInteger(v) ? `₱${v}` : `₱${v.toFixed(2)}`;
}

export function PricesScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const catalog = useCatalog();
  const prices = usePrices(catalog);
  const market = catalog.markets.find((m) => m.id === catalog.marketId) ?? catalog.markets[0];

  const today = manilaToday();
  const q = query.trim().toLowerCase();
  const rows = [...catalog.ingredients]
    .sort(order)
    .filter(
      (i) =>
        prices[i.id] &&
        (filter === 'All' || FILTER_OF[i.category] === filter) &&
        (!q || i.name.toLowerCase().includes(q) || i.aliases.some((a) => a.includes(q))),
    );

  const pick = (f: Filter) => {
    if (f === filter) return;
    void runTransition('fade', () => flushSync(() => setFilter(f)));
  };

  return (
    <Screen presentation="tab" label="Market prices" scrollKey="/prices">
      <div className="flex flex-col gap-3.5 px-5 pt-6 pb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Today&apos;s prices</h1>
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
            {market?.name} · free for everyone <SourceNote catalog={catalog} />
          </div>
        </div>

        <div className="flex h-12 items-center gap-2.5 rounded-[14px] bg-surface px-3.5">
          <Search size={18} strokeWidth={2.4} className="flex-none text-muted" aria-hidden="true" />
          <label htmlFor="priceSearch" className="sr-only">
            Search prices
          </label>
          <input
            id="priceSearch"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kamatis, itlog, bangus"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted"
          />
        </div>

        <div role="radiogroup" aria-label="Filter" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(f)}
                className={cn(
                  'press hit h-9 flex-none rounded-full px-3.5 text-[13px] font-bold',
                  on ? 'bg-ink text-white' : 'border border-line bg-white text-ink',
                )}
              >
                {f}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
          <span>Sources, in order:</span>
          <Pill tone="tier-contributor" className="py-[3px] font-bold">
            1 Contributor
          </Pill>
          <Pill tone="tier-da" className="py-[3px] font-bold">
            2 DA market
          </Pill>
          <Pill tone="tier-avg" className="py-[3px] font-bold">
            3 DA average
          </Pill>
          <Pill tone="tier-est" className="px-[7px] py-0.5 font-bold">
            4 Estimate
          </Pill>
        </div>

        <ul className="flex flex-col" aria-label="Prices">
          {rows.map((i) => {
            const p = prices[i.id];
            const ch = changeOf(p.price, p.prevPrice);
            return (
              <li key={i.id} className="flex items-center gap-3 border-b border-line py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{shortName(i.name)}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <TierPill tier={p.tier} />
                    <span className="text-[12px] text-muted">{shortDate(p.observedAt, today)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-extrabold">
                    {money(p.price)}
                    <span className="text-[12px] font-semibold text-muted">{perUnit(i.unit)}</span>
                  </div>
                  {ch ? (
                    <Pill tone={ch.tone} className="mt-0.5 px-[7px] py-px">
                      {ch.text}
                    </Pill>
                  ) : null}
                </div>
              </li>
            );
          })}
          {rows.length === 0 ? (
            <li className="py-3 text-[14px] text-muted">No match. Try the Filipino or English name, like &quot;tomato&quot;.</li>
          ) : null}
        </ul>
      </div>
    </Screen>
  );
}

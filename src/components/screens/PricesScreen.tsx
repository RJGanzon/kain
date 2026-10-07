'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Pill, SampleBadge, type PillTone } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { peso2 } from '@/lib/format';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';
import { SAMPLE_MARKETS, SAMPLE_PRICES, TIER_LABEL, type SamplePrice, type Tier } from '@/lib/sample/plan';
import { useMarket } from '@/lib/store/device';

const FILTERS = ['All', 'Fish', 'Meat', 'Vegetables', 'Pantry'] as const;
type Filter = (typeof FILTERS)[number];

const TIER_TONE: Record<Tier, PillTone> = {
  contrib: 'tier-contributor',
  log: 'tier-log',
  da_market: 'tier-da',
  da_avg: 'tier-avg',
  estimate: 'tier-est',
};

/** 4-week change: under 3% steady; ▲ 15% or more bad, ▲ under 15% warn; ▼ good. */
function change(ch: number): { text: string; tone: PillTone } {
  if (Math.abs(ch) < 0.03) return { text: 'steady', tone: 'steady' };
  const pct = Math.round(Math.abs(ch) * 100);
  if (ch > 0) return { text: `▲ ${pct}%`, tone: ch >= 0.15 ? 'bad' : 'warn' };
  return { text: `▼ ${pct}%`, tone: 'good' };
}

function dateLabel(iso: string): string {
  if (iso === 'today') return 'Today';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function price(p: SamplePrice): string {
  return Number.isInteger(p.price) ? `₱${p.price}` : peso2(p.price);
}

export function PricesScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [marketId] = useMarket();
  const market = SAMPLE_MARKETS.find((m) => m.id === marketId) ?? SAMPLE_MARKETS[0];

  const q = query.trim().toLowerCase();
  const rows = SAMPLE_PRICES.filter(
    (p) => (filter === 'All' || p.filter === filter) && (!q || p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.includes(q))),
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
            {market.name} · free for everyone <SampleBadge />
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
          {rows.map((p) => {
            const ch = change(p.change);
            return (
              <li key={p.id} className="flex items-center gap-3 border-b border-line py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Pill tone={TIER_TONE[p.tier]} className="px-[7px] py-px font-bold">
                      {TIER_LABEL[p.tier]}
                    </Pill>
                    <span className="text-[12px] text-muted">{dateLabel(p.date)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-extrabold">
                    {price(p)}
                    <span className="text-[12px] font-semibold text-muted">{p.unit}</span>
                  </div>
                  <Pill tone={ch.tone} className="mt-0.5 px-[7px] py-px">
                    {ch.text}
                  </Pill>
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

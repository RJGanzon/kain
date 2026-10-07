'use client';

import { Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { IconTile } from '@/components/ui/bits';
import { iconButtonClass } from '@/components/ui/IconButton';
import { Meter } from '@/components/ui/Meter';
import { Pill, SampleBadge, type PillTone } from '@/components/ui/Pill';
import { Segmented } from '@/components/ui/Segmented';
import { kg, peso, peso2 } from '@/lib/format';
import { NavLink } from '@/lib/nav/links';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';
import { dayTotals, potNumbers, SAMPLE_DISHES, SAMPLE_POTS } from '@/lib/sample/eatery';

type View = 'today' | 'menu';

/** Margin pill: 50% and up good, 30–49% warn, below 30% bad. */
function marginTone(ratio: number): PillTone {
  return ratio >= 0.5 ? 'good' : ratio >= 0.3 ? 'warn' : 'bad';
}

export function EateryScreen() {
  const [view, setView] = useState<View>('today');
  const switchTo = (next: View) =>
    void runTransition(next === 'menu' ? 'seg-next' : 'seg-prev', () => flushSync(() => setView(next)));

  return (
    <Screen presentation="tab" label="Eatery" scrollKey="/eatery">
      <div className="flex flex-col gap-3.5 px-5 pt-4 pb-6">
        <header className="flex h-[52px] items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Your carinderia</h1>
              <NavLink href="/business" kind="sheet-up" className="press hit rounded-full bg-brand px-[9px] py-[3px] text-[11px] font-extrabold text-ink no-underline">
                Business
              </NavLink>
            </div>
            <div className="text-[13px] font-semibold text-muted">Tuesday · 1:30 pm · Pampang prices</div>
          </div>
          <NavLink href="/business" kind="sheet-up" aria-label="Add dish" className={iconButtonClass('ink')}>
            <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
          </NavLink>
        </header>

        <Segmented
          label="Eatery view"
          value={view}
          onChange={switchTo}
          transitionName
          options={[
            { value: 'today', label: "Today's sales" },
            { value: 'menu', label: 'Menu costs' },
          ]}
        />

        <div data-vt-seg-content>{view === 'today' ? <TodaySales /> : <MenuCosts />}</div>
      </div>
    </Screen>
  );
}

function TodaySales() {
  const t = dayTotals(SAMPLE_DISHES);
  return (
    <div className="flex flex-col gap-3.5">
      <section aria-label="Profit right now" className="flex flex-col gap-3 rounded-[24px] bg-ink px-5 py-[18px] text-white">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold text-on-dark-muted">Profit right now</div>
          <div className="text-[12px] font-bold text-brand">
            {kg(t.soldKg)} of {kg(t.cookedKg)} kg sold
          </div>
        </div>
        <div className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{peso(t.profitNow)}</div>
        <div className="text-[12px] font-semibold text-on-dark-muted">
          Sales {peso(t.sales)} minus cost of food cooked {peso(t.cost)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-white/8 px-3 py-2.5">
            <div className="text-[11px] font-bold text-on-dark-muted">If the rest sells</div>
            <div className="text-[17px] font-extrabold text-brand">{peso(t.ifAllSells)}</div>
          </div>
          <div className="rounded-[14px] bg-white/8 px-3 py-2.5">
            <div className="text-[11px] font-bold text-on-dark-muted">Still in the pots</div>
            <div className="text-[17px] font-extrabold">
              {kg(t.leftKg)} kg · {peso(t.leftValue)}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pots-title" className="flex flex-col">
        <div className="flex items-center justify-between gap-2 pb-0.5">
          <h2 id="pots-title" className="flex items-center gap-2 text-[17px] font-extrabold">
            Pots today <SampleBadge />
          </h2>
          <div className="text-right text-[12px] font-semibold text-muted">profit so far · if all sells</div>
        </div>
        {SAMPLE_POTS.map((d) => {
          const n = potNumbers(d);
          const behind = n.profitNow < 0;
          return (
            <NavLink
              key={d.id}
              href={`/eatery/pot/${d.id}`}
              kind="push-full"
              className="press flex items-center gap-3 border-b border-line py-2.5 text-ink no-underline"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <div className="text-[15px] font-bold">{d.name}</div>
                <Meter value={d.soldKg / d.cookedKg} height={6} />
                <div className="text-[12px] text-muted">
                  {kg(d.soldKg)} of {kg(d.cookedKg)} kg sold · <span className="font-bold text-ink">{kg(d.cookedKg - d.soldKg)} kg left</span>
                </div>
              </div>
              <div className="flex-none text-right">
                <div className={behind ? 'text-[15px] font-extrabold text-warn' : 'text-[15px] font-extrabold text-good'}>
                  {behind ? `${peso(-n.profitNow)} to break even` : peso(n.profitNow)}
                </div>
                <div className="text-[12px] text-muted">{peso(n.ifAllSells)} if all sells</div>
              </div>
            </NavLink>
          );
        })}
      </section>
    </div>
  );
}

function MenuCosts() {
  return (
    <div className="flex flex-col gap-3.5">
      <div role="status" className="flex items-center gap-3 rounded-[18px] bg-bad-bg px-3.5 py-3">
        <IconTile size={36} radius={12} className="bg-white">
          <TrendingUp size={18} strokeWidth={2.4} className="text-bad-icon" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-bad">Kamatis up 41% this month</div>
          <div className="text-[12px] font-semibold text-bad">Adds up to ₱1.40 per serving · 4 dishes</div>
        </div>
      </div>
      <section aria-labelledby="menu-title" className="flex flex-col">
        <div className="flex items-center justify-between gap-2 pb-0.5">
          <h2 id="menu-title" className="flex flex-none items-center gap-2 text-[17px] font-extrabold">
            Menu · {SAMPLE_DISHES.length} dishes <SampleBadge />
          </h2>
          <div className="text-right text-[12px] font-semibold text-muted">per serving, at today&apos;s prices</div>
        </div>
        {SAMPLE_DISHES.map((d) => {
          const margin = d.price - d.cost;
          const ratio = margin / d.price;
          return (
            <div key={d.id} className="flex items-center gap-3 border-b border-line py-[11px]">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{d.name}</div>
                <div className="text-[12px] text-muted">
                  Cost {peso2(d.cost)} · sells {peso(d.price)} · {Math.round(d.orderKg * 1000)} g per order
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-extrabold">{peso2(margin)}</div>
                <Pill tone={marginTone(ratio)} className="mt-0.5">
                  {Math.round(ratio * 100)}% margin
                </Pill>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

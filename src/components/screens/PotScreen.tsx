'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Lightbulb, Minus, Scale } from 'lucide-react';
import { Suspense, useCallback, useState } from 'react';
import { Overline } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Meter';
import { SampleBadge } from '@/components/ui/Pill';
import { kg, peso } from '@/lib/format';
import { BackButton, NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { Sheet } from '@/lib/nav/Sheet';
import { potNumbers, sampleDish, type SampleDish } from '@/lib/sample/eatery';

/** A short tap of haptic feedback where the phone supports it (Android). */
function tick() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

export function PotScreen({ id }: { id: string }) {
  const dish = sampleDish(id)!;
  const [sold, setSold] = useState(() => potNumbers(dish).sold);
  const n = potNumbers(dish, sold);
  const ahead = n.profitNow >= 0;
  const soldKg = n.sold * dish.orderKg;
  const leftKg = n.left * dish.orderKg;
  const breakEvenAt = Math.min(1, n.breakEven / n.orders);
  const record = (delta: number) => {
    tick();
    setSold((s) => Math.max(0, Math.min(n.orders, s + delta)));
  };

  return (
    <Screen
      presentation="stack-full"
      label={`${dish.name} pot`}
      backFallback="/eatery"
      footer={<Button onClick={() => nav.back('/eatery', 'pop-full')}>Done</Button>}
    >
      <div className="flex flex-col gap-4 px-5 pt-4 pb-4">
        <header className="flex h-11 items-center justify-between">
          <BackButton fallback="/eatery" kind="pop-full" />
          <div className="text-center">
            <h1 className="text-[16px] font-extrabold">{dish.name}</h1>
            <div className="text-[12px] font-semibold text-muted">
              {kg(dish.cookedKg)} kg pot · cooked {dish.cookedAt}
            </div>
          </div>
          <div className="w-11" />
        </header>

        <section aria-label="Pot" className="flex flex-col gap-3.5 rounded-[24px] bg-surface p-[18px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Overline>Cooked</Overline>
              <div className="text-[24px] font-extrabold">{kg(dish.cookedKg)} kg</div>
            </div>
            <div>
              <Overline>Sold</Overline>
              <div className="text-[24px] font-extrabold">{kg(soldKg)} kg</div>
            </div>
            <div className="rounded-[14px] bg-white pt-0.5 pb-1">
              <Overline>Left</Overline>
              <div className="text-[24px] font-extrabold">{kg(leftKg)} kg</div>
            </div>
          </div>
          <div className="relative pt-[18px]">
            <div
              className="absolute top-0 -translate-x-1/2 text-[10px] font-extrabold whitespace-nowrap text-muted"
              style={{ left: `${breakEvenAt * 100}%` }}
            >
              break-even
            </div>
            <Meter
              value={n.sold / n.orders}
              height={12}
              trackClassName="bg-track-strong"
              fillColor={ahead ? 'var(--ink)' : 'var(--warn-bar)'}
              label={`${n.sold} of ${n.orders} orders sold; break-even at ${n.breakEven}`}
            />
            <div className="absolute top-[15px] h-[18px] w-0.5 bg-ink" style={{ left: `${breakEvenAt * 100}%` }} aria-hidden="true" />
          </div>
          <div className="text-center text-[13px] font-semibold text-ink-soft">
            {n.sold} of {n.orders} orders sold · {n.left} left · 1 order ≈ {Math.round(dish.orderKg * 1000)} g
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-muted">Record a sale</div>
            <SampleBadge />
          </div>
          <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <button
              type="button"
              aria-label="Undo one order"
              disabled={n.sold === 0}
              onClick={() => record(-1)}
              className="press flex h-[52px] items-center justify-center rounded-[16px] border border-line bg-white text-ink disabled:text-line-strong"
            >
              <Minus size={22} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={n.left === 0}
              onClick={() => record(1)}
              className="press h-[52px] rounded-[16px] bg-brand text-[15px] font-extrabold text-ink disabled:opacity-40"
            >
              +1 order
            </button>
            <button
              type="button"
              disabled={n.left === 0}
              onClick={() => record(5)}
              className="press h-[52px] rounded-[16px] bg-ink text-[15px] font-extrabold text-white disabled:opacity-40"
            >
              +5 orders
            </button>
          </div>
          <NavLink
            href={`/eatery/pot/${dish.id}?sheet=weigh`}
            kind="sheet-up"
            className="press hit flex items-center justify-center gap-1.5 self-center py-1 text-[14px] font-bold text-ink underline underline-offset-3"
          >
            <Scale size={16} strokeWidth={2.2} aria-hidden="true" />
            Weigh the pot instead
          </NavLink>
        </div>

        <section aria-label="Totals" className="rounded-[20px] border border-line px-4 py-1.5">
          <div className="flex justify-between border-b border-line py-2.5 text-[14px]">
            <span className="font-semibold">Sales so far</span>
            <span className="font-extrabold">{peso(n.sales)}</span>
          </div>
          <div className="flex justify-between border-b border-line py-2.5 text-[14px]">
            <span className="font-semibold">Cost of the whole pot</span>
            <span className="font-extrabold">{peso(-n.potCost)}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-line py-3">
            <span className="text-[15px] font-extrabold">{ahead ? 'Profit so far' : 'Still to break even'}</span>
            <span className={ahead ? 'text-[22px] font-extrabold text-good' : 'text-[22px] font-extrabold text-warn'}>
              {peso(n.profitNow)}
            </span>
          </div>
          <div className="flex justify-between py-2.5 text-[14px]">
            <span className="font-semibold text-muted">Estimated if the rest sells</span>
            <span className="font-extrabold">{peso(n.ifAllSells)}</span>
          </div>
        </section>

        {n.left > 0 ? (
          <div className="flex items-start gap-3 rounded-[18px] bg-brand-tint px-3.5 py-3">
            <Lightbulb size={20} strokeWidth={2.2} className="mt-px flex-none" aria-hidden="true" />
            <p className="text-[13px] leading-[1.4] font-semibold text-on-brand">
              {n.left} {n.left === 1 ? 'order' : 'orders'} ({kg(leftKg)} kg) left. Selling them at {peso(dish.latePrice)} after 6 pm still
              brings in {peso(n.left * dish.latePrice)} instead of going to waste.
            </p>
          </div>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <WeighSheet dish={dish} onWeighed={(left) => setSold(Math.round((dish.cookedKg - left) / dish.orderKg))} />
      </Suspense>
    </Screen>
  );
}

/** "Weigh the pot instead": enter the kg left; sold = cooked − left. */
function WeighSheet({ dish, onWeighed }: { dish: SampleDish; onWeighed: (kgLeft: number) => void }) {
  const open = useSearchParams().get('sheet') === 'weigh';
  const pathname = usePathname();
  const [value, setValue] = useState('');
  const close = useCallback((opts?: { animate?: boolean }) => nav.dismiss(pathname, opts), [pathname]);
  const kgLeft = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(kgLeft) && kgLeft >= 0 && kgLeft <= dish.cookedKg;

  return (
    <Sheet open={open} title="Weigh the pot" onClose={close}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onWeighed(kgLeft);
          setValue('');
          close();
        }}
      >
        <label htmlFor="kg-left" className="text-[14px] leading-[1.45] text-muted">
          How many kilos are left in the {dish.name} pot? It held {kg(dish.cookedKg)} kg.
        </label>
        <div className="flex h-14 items-center gap-2 rounded-[14px] bg-surface px-4">
          <input
            id="kg-left"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[20px] font-extrabold outline-none"
          />
          <span className="text-[15px] font-bold text-muted">kg left</span>
        </div>
        {value.trim() !== '' && !valid ? (
          <p className="text-[13px] font-semibold text-bad">Enter a number from 0 to {kg(dish.cookedKg)}.</p>
        ) : null}
        <Button type="submit" disabled={!valid} className="disabled:opacity-40">
          Update sold
        </Button>
      </form>
    </Sheet>
  );
}

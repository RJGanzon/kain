'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Lightbulb, Minus, Scale } from 'lucide-react';
import { Suspense, useCallback, useState } from 'react';
import { Overline } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Meter';
import { NumberField, toNumber } from '@/components/ui/NumberField';
import { SyncNote } from '@/components/ui/SyncNote';
import { recordSale, removePot, usePot, type PotView } from '@/lib/eatery/store';
import { kg, peso } from '@/lib/format';
import { useHydrated } from '@/lib/hydrated';
import { BackButton, NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { Sheet } from '@/lib/nav/Sheet';

/** A short tap of haptic feedback where the phone supports it (Android). */
function tick() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

let timeFmt: Intl.DateTimeFormat | null = null;
function cookedTime(ms: number): string {
  timeFmt ??= new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
  return timeFmt.format(new Date(ms)).replace(/\s*(AM|PM)$/i, (m) => ' ' + m.trim().toLowerCase());
}

export function PotScreen() {
  const id = useSearchParams().get('id');
  const view = usePot(id);
  const hydrated = useHydrated();

  if (!view) {
    return (
      <Screen presentation="stack-full" label="Pot" backFallback="/eatery">
        <div className="flex flex-col gap-4 px-5 pt-4">
          <BackButton fallback="/eatery" kind="pop-full" />
          {hydrated ? <p className="text-[15px] text-muted">This pot isn&apos;t on this phone. It may have been removed.</p> : null}
        </div>
      </Screen>
    );
  }
  return <PotDetail view={view} />;
}

function PotDetail({ view }: { view: PotView }) {
  const { pot, dish, numbers: n } = view;
  const [confirm, setConfirm] = useState(false);
  const ahead = n.profitNow >= 0;
  const breakEvenAt = n.orders ? Math.min(1, n.breakEven / n.orders) : 1;
  const latePrice = dish.item.latePrice;
  const record = (delta: number) => {
    const next = Math.max(0, Math.min(n.orders, n.sold + delta));
    if (next === n.sold) return;
    tick();
    void recordSale(pot.id, next - n.sold);
  };

  return (
    <Screen
      presentation="stack-full"
      label={`${dish.recipe.name} pot`}
      backFallback="/eatery"
      footer={<Button onClick={() => nav.back('/eatery', 'pop-full')}>Done</Button>}
    >
      <div className="flex flex-col gap-4 px-5 pt-4 pb-4">
        <header className="flex h-11 items-center justify-between">
          <BackButton fallback="/eatery" kind="pop-full" />
          <div className="text-center">
            <h1 className="text-[16px] font-extrabold">{dish.recipe.name}</h1>
            <div className="text-[12px] font-semibold text-muted">
              {kg(pot.cookedKg)} kg pot · cooked {cookedTime(pot.cookedAt)}
            </div>
          </div>
          <div className="w-11" />
        </header>

        <section aria-label="Pot" className="flex flex-col gap-3.5 rounded-[24px] bg-surface p-[18px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Overline>Cooked</Overline>
              <div className="text-[24px] font-extrabold">{kg(pot.cookedKg)} kg</div>
            </div>
            <div>
              <Overline>Sold</Overline>
              <div className="text-[24px] font-extrabold">{kg(n.soldKg)} kg</div>
            </div>
            <div className="rounded-[14px] bg-white pt-0.5 pb-1">
              <Overline>Left</Overline>
              <div className="text-[24px] font-extrabold">{kg(n.leftKg)} kg</div>
            </div>
          </div>
          <div className="relative pt-[18px]">
            <div
              className="absolute top-0 -translate-x-1/2 text-[10px] font-extrabold whitespace-nowrap text-muted"
              style={{ left: `${Math.min(92, Math.max(8, breakEvenAt * 100))}%` }}
            >
              break-even
            </div>
            <Meter
              value={n.orders ? n.sold / n.orders : 0}
              height={12}
              trackClassName="bg-track-strong"
              fillColor={ahead ? 'var(--ink)' : 'var(--warn-bar)'}
              label={`${n.sold} of ${n.orders} orders sold; break-even at ${n.breakEven}`}
            />
            <div className="absolute top-[15px] h-[18px] w-0.5 bg-ink" style={{ left: `${breakEvenAt * 100}%` }} aria-hidden="true" />
          </div>
          <div className="text-center text-[13px] font-semibold text-ink-soft">
            {n.sold} of {n.orders} orders sold · {n.left} left · 1 order ≈ {Math.round(dish.orderG)} g
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-muted">Record a sale</div>
            <SyncNote />
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
            href={`/eatery/pot?id=${pot.id}&sheet=weigh`}
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
            <span className={ahead ? 'text-[22px] font-extrabold text-good' : 'text-[22px] font-extrabold text-warn'}>{peso(n.profitNow)}</span>
          </div>
          <div className="flex justify-between py-2.5 text-[14px]">
            <span className="font-semibold text-muted">Estimated if the rest sells</span>
            <span className="font-extrabold">{peso(n.ifAllSells)}</span>
          </div>
        </section>

        {n.left > 0 && latePrice ? (
          <div className="flex items-start gap-3 rounded-[18px] bg-brand-tint px-3.5 py-3">
            <Lightbulb size={20} strokeWidth={2.2} className="mt-px flex-none" aria-hidden="true" />
            <p className="text-[13px] leading-[1.4] font-semibold text-on-brand">
              {n.left} {n.left === 1 ? 'order' : 'orders'} ({kg(n.leftKg)} kg) left. Selling them at {peso(latePrice)} after 6 pm still brings in{' '}
              {peso(n.left * latePrice)} instead of going to waste.
            </p>
          </div>
        ) : null}

        {confirm ? (
          <div className="flex items-center justify-between gap-3 rounded-[16px] bg-bad-bg px-3.5 py-2.5">
            <span className="text-[14px] font-bold text-bad">Remove this pot and its sales?</span>
            <button
              type="button"
              onClick={async () => {
                await removePot(pot.id);
                nav.back('/eatery', 'pop-full');
              }}
              className="press h-10 rounded-[12px] bg-bad px-3.5 text-[14px] font-extrabold text-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="press hit self-center py-1 text-[13px] font-bold text-muted underline underline-offset-3">
            Remove this pot
          </button>
        )}
      </div>

      <Suspense fallback={null}>
        <WeighSheet view={view} />
      </Suspense>
    </Screen>
  );
}

/** "Weigh the pot instead": enter the kg left; sold = cooked − left. */
function WeighSheet({ view }: { view: PotView }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const open = pathname === '/eatery/pot' && params.get('sheet') === 'weigh';
  const { pot, dish, numbers: n } = view;
  const [value, setValue] = useState('');
  const close = useCallback((opts?: { animate?: boolean }) => nav.dismiss(`/eatery/pot?id=${pot.id}`, opts), [pot.id]);
  const kgLeft = toNumber(value);
  const valid = Number.isFinite(kgLeft) && kgLeft >= 0 && kgLeft <= pot.cookedKg;
  const soldAfter = valid ? Math.max(0, Math.min(n.orders, Math.round((pot.cookedKg - kgLeft) / (dish.orderG / 1000)))) : n.sold;

  return (
    <Sheet open={open} title="Weigh the pot" onClose={close}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await recordSale(pot.id, soldAfter - n.sold);
          setValue('');
          close();
        }}
      >
        <NumberField
          label={`How many kilos are left in the ${dish.recipe.name} pot? It held ${kg(pot.cookedKg)} kg.`}
          suffix="kg left"
          decimal
          value={value}
          onChange={setValue}
          hint={valid ? `That's ${soldAfter} of ${n.orders} orders sold.` : undefined}
        />
        {value.trim() !== '' && !valid ? <p className="text-[13px] font-semibold text-bad">Enter a number from 0 to {kg(pot.cookedKg)}.</p> : null}
        <Button type="submit" disabled={!valid} className="disabled:opacity-40">
          Update sold
        </Button>
      </form>
    </Sheet>
  );
}

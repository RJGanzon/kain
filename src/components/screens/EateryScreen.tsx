'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, CookingPot, Lock, Plus, TrendingUp } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { EaterySignIn } from '@/components/auth/EaterySignIn';
import { IconTile } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { iconButtonClass } from '@/components/ui/IconButton';
import { Meter } from '@/components/ui/Meter';
import { NumberField, toNumber } from '@/components/ui/NumberField';
import { Pill } from '@/components/ui/Pill';
import { Segmented as SegmentedControl } from '@/components/ui/Segmented';
import { SourceNote } from '@/components/ui/SourceNote';
import { useSession } from '@/lib/auth/session';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/data/catalog';
import { marginTone, spikeAlerts, substitutes } from '@/lib/eatery/math';
import { addDish, cookPot, FREE_DISH_LIMIT, removeDish, updateDish, useEatery, usePlanTier } from '@/lib/eatery/store';
import { kg, peso, peso2 } from '@/lib/format';
import { useHydrated } from '@/lib/hydrated';
import { usePrices } from '@/lib/log/prices';
import { NavLink } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { Sheet } from '@/lib/nav/Sheet';
import { runTransition } from '@/lib/nav/transition';
import { backendConfigured } from '@/lib/supabase/client';
import { shortName } from '@/lib/planner/describe';

type View = 'today' | 'menu';

let timeFmt: Intl.DateTimeFormat | null = null;
function headerLine(marketName: string | undefined): string {
  timeFmt ??= new Intl.DateTimeFormat('en-PH', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
  const parts = timeFmt.formatToParts(new Date());
  const day = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const time = parts
    .filter((p) => ['hour', 'minute', 'literal', 'dayPeriod'].includes(p.type))
    .map((p) => p.value)
    .join('')
    .replace(/^[,\s]+/, '')
    .replace(/\s*(AM|PM)$/i, (m) => ' ' + m.trim().toLowerCase());
  return `${day} · ${time} · ${marketName?.replace(/ Market$/, '') ?? ''} prices`;
}

export function EateryScreen() {
  const [view, setView] = useState<View>('today');
  const [tier] = usePlanTier();
  const data = useEatery();
  const catalog = useCatalog();
  const hydrated = useHydrated();
  const { ready, session } = useSession();
  // With a backend, the eatery needs an account; without one (a demo copy) it runs on this phone only.
  const gated = hydrated && backendConfigured();
  const needsSignIn = gated && ready && !session;
  const waiting = gated && !ready;
  const market = catalog.markets.find((m) => m.id === catalog.marketId);
  const atLimit = tier === 'free' && data.dishes.length >= FREE_DISH_LIMIT;
  const switchTo = (next: View) => void runTransition(next === 'menu' ? 'seg-next' : 'seg-prev', () => flushSync(() => setView(next)));
  const addHref = atLimit ? '/business' : '/eatery?sheet=add-dish';

  return (
    <Screen presentation="tab" label="Eatery" scrollKey="/eatery">
      <div className="flex flex-col gap-3.5 px-5 pt-4 pb-6">
        <header className="flex min-h-[52px] items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Your carinderia</h1>
              <NavLink
                href="/business"
                kind="sheet-up"
                className={cn(
                  'press hit rounded-full px-[9px] py-[3px] text-[11px] font-extrabold whitespace-nowrap no-underline',
                  tier === 'business' ? 'bg-brand text-ink' : 'bg-surface text-ink',
                )}
              >
                {tier === 'business' ? 'Business' : `Free · ${Math.min(data.dishes.length, FREE_DISH_LIMIT)} of ${FREE_DISH_LIMIT}`}
              </NavLink>
            </div>
            <div className="min-h-[17px] text-[13px] font-semibold text-muted">{hydrated ? headerLine(market?.name) : null}</div>
          </div>
          {needsSignIn ? null : (
            <NavLink href={addHref} kind="sheet-up" aria-label="Add dish" className={iconButtonClass('ink')}>
              <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
            </NavLink>
          )}
        </header>

        {waiting ? null : needsSignIn ? (
          <EaterySignIn />
        ) : hydrated && data.dishes.length === 0 ? (
          <FirstDish />
        ) : (
          <>
            <Segmented view={view} onChange={switchTo} />
            <div data-vt-seg-content>{view === 'today' ? <TodaySales /> : <MenuCosts />}</div>
          </>
        )}
      </div>

      <Suspense fallback={null}>
        <EaterySheets />
      </Suspense>
    </Screen>
  );
}


function Segmented({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <SegmentedControl
      label="Eatery view"
      value={view}
      onChange={onChange}
      transitionName
      options={[
        { value: 'today', label: "Today's sales" },
        { value: 'menu', label: 'Menu costs' },
      ]}
    />
  );
}

function FirstDish() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[24px] bg-surface p-5">
      <IconTile size={48} className="bg-white">
        <CookingPot size={22} strokeWidth={2} />
      </IconTile>
      <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Add your first dish</h2>
      <p className="text-[14px] leading-[1.45] text-muted">
        Kain costs each order at today&apos;s market prices. Then record what you sell from each pot to see your profit as the day goes.
      </p>
      <NavLink href="/eatery?sheet=add-dish" kind="sheet-up" className="press mt-1 flex h-12 items-center gap-2 rounded-[16px] bg-ink px-5 text-[15px] font-extrabold text-white no-underline">
        <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
        Add a dish
      </NavLink>
      <p className="text-[12px] text-muted">The free plan covers {FREE_DISH_LIMIT} dishes.</p>
    </div>
  );
}

function TodaySales() {
  const { pots, dishes } = useEatery();
  const catalog = useCatalog();
  const totals = useMemo(() => {
    let cookedKg = 0;
    let soldKg = 0;
    let sales = 0;
    let cost = 0;
    let full = 0;
    for (const p of pots) {
      cookedKg += p.pot.cookedKg;
      soldKg += p.numbers.soldKg;
      sales += p.numbers.sales;
      cost += p.numbers.potCost;
      full += p.numbers.orders * p.dish.price;
    }
    return { cookedKg, soldKg, leftKg: Math.max(0, cookedKg - soldKg), sales, cost, profitNow: sales - cost, ifAll: full - cost, leftValue: full - sales };
  }, [pots]);
  const cookedIds = new Set(pots.map((p) => p.dish.item.id));
  const notCooked = dishes.filter((d) => !cookedIds.has(d.item.id));

  return (
    <div className="flex flex-col gap-3.5">
      {pots.length ? (
        <section aria-label="Profit right now" className="flex flex-col gap-3 rounded-[24px] bg-ink px-5 py-[18px] text-white">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-on-dark-muted">Profit right now</div>
            <div className="text-[12px] font-bold text-brand">
              {kg(totals.soldKg)} of {kg(totals.cookedKg)} kg sold
            </div>
          </div>
          <div className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{peso(totals.profitNow)}</div>
          <div className="text-[12px] font-semibold text-on-dark-muted">
            Sales {peso(totals.sales)} minus cost of food cooked {peso(totals.cost)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] bg-white/8 px-3 py-2.5">
              <div className="text-[11px] font-bold text-on-dark-muted">If the rest sells</div>
              <div className="text-[17px] font-extrabold text-brand">{peso(totals.ifAll)}</div>
            </div>
            <div className="rounded-[14px] bg-white/8 px-3 py-2.5">
              <div className="text-[11px] font-bold text-on-dark-muted">Still in the pots</div>
              <div className="text-[17px] font-extrabold">
                {kg(totals.leftKg)} kg · {peso(totals.leftValue)}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {pots.length ? (
        <section aria-labelledby="pots-title" className="flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-0.5">
            <h2 id="pots-title" className="flex items-center gap-2 text-[17px] font-extrabold">
              Pots today <SourceNote catalog={catalog} />
            </h2>
            <div className="text-right text-[12px] font-semibold text-muted">profit so far · if all sells</div>
          </div>
          {pots.map(({ pot, dish, numbers: n }) => {
            const behind = n.profitNow < 0;
            return (
              <NavLink
                key={pot.id}
                href={`/eatery/pot?id=${pot.id}`}
                kind="push-full"
                className="press flex items-center gap-3 border-b border-line py-2.5 text-ink no-underline"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <div className="text-[15px] font-bold">{dish.recipe.name}</div>
                  <Meter value={n.soldKg / pot.cookedKg} height={6} />
                  <div className="text-[12px] text-muted">
                    {kg(n.soldKg)} of {kg(pot.cookedKg)} kg sold · <span className="font-bold text-ink">{kg(n.leftKg)} kg left</span>
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className={cn('text-[15px] font-extrabold', behind ? 'text-warn' : 'text-good')}>
                    {behind ? `${peso(-n.profitNow)} to break even` : peso(n.profitNow)}
                  </div>
                  <div className="text-[12px] text-muted">{peso(n.ifAllSells)} if all sells</div>
                </div>
              </NavLink>
            );
          })}
        </section>
      ) : null}

      {notCooked.length ? (
        <section aria-labelledby="cook-title" className="flex flex-col gap-2">
          <h2 id="cook-title" className="text-[17px] font-extrabold">
            {pots.length ? 'Cook another pot' : 'Cook a pot to start the day'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {notCooked.map((d) => (
              <NavLink
                key={d.item.id}
                href={`/eatery?sheet=cook&dish=${d.item.id}`}
                kind="sheet-up"
                className="press hit flex h-10 items-center gap-1.5 rounded-full border border-line bg-white pr-3.5 pl-3 text-[14px] font-bold text-ink no-underline"
              >
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                {d.recipe.name}
              </NavLink>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MenuCosts() {
  const { dishes, ingredients } = useEatery();
  const catalog = useCatalog();
  const prices = usePrices(catalog);
  const [tier] = usePlanTier();
  const business = tier === 'business';
  const alerts = useMemo(() => spikeAlerts(dishes, ingredients, prices), [dishes, ingredients, prices]);
  const subs = useMemo(() => substitutes(dishes, ingredients, prices, catalog.substituteGroups), [dishes, ingredients, prices, catalog.substituteGroups]);

  return (
    <div className="flex flex-col gap-3.5">
      {business ? (
        alerts.length ? (
          <div role="status" className="flex items-center gap-3 rounded-[18px] bg-bad-bg px-3.5 py-3">
            <IconTile size={36} radius={12} className="bg-white">
              <TrendingUp size={18} strokeWidth={2.4} className="text-bad-icon" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-extrabold text-bad">
                {shortName(ingredients.get(alerts[0].ingredientId)?.name ?? '')} up {Math.round(alerts[0].change * 100)}% this month
              </div>
              <div className="text-[12px] font-semibold text-bad">
                Adds up to {peso2(alerts[0].perServing)} per serving ({alerts[0].worstDish}) · {alerts[0].dishes.length}{' '}
                {alerts[0].dishes.length === 1 ? 'dish' : 'dishes'}
              </div>
              {alerts.length > 1 ? (
                <div className="mt-0.5 text-[12px] font-semibold text-bad">
                  Also up:{' '}
                  {alerts
                    .slice(1, 4)
                    .map((a) => `${shortName(ingredients.get(a.ingredientId)?.name ?? '')} ${Math.round(a.change * 100)}%`)
                    .join(', ')}
                </div>
              ) : null}
            </div>
          </div>
        ) : null
      ) : (
        <NavLink href="/business" kind="sheet-up" className="press flex items-center gap-3 rounded-[18px] bg-surface px-3.5 py-3 text-ink no-underline">
          <IconTile size={36} radius={12} className="bg-white">
            <Lock size={17} strokeWidth={2.4} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold">Price spike alerts and cheaper substitutes</div>
            <div className="text-[12px] font-semibold text-muted">Know when an ingredient you use jumps, and what to swap in.</div>
          </div>
          <Pill tone="brand">Business</Pill>
        </NavLink>
      )}

      <section aria-labelledby="menu-title" className="flex flex-col">
        <div className="flex items-center justify-between gap-2 pb-0.5">
          <h2 id="menu-title" className="flex flex-none items-center gap-2 text-[17px] font-extrabold">
            Menu · {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} <SourceNote catalog={catalog} />
          </h2>
          <div className="text-right text-[12px] font-semibold text-muted">per serving, at today&apos;s prices</div>
        </div>
        {dishes.map((d) => (
          <NavLink
            key={d.item.id}
            href={`/eatery?sheet=edit&dish=${d.item.id}`}
            kind="sheet-up"
            className="press flex items-center gap-3 border-b border-line py-[11px] text-ink no-underline"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{d.recipe.name}</div>
              <div className="text-[12px] text-muted">
                Cost {peso2(d.cost)} · sells {peso(d.price)} · {Math.round(d.orderG)} g per order
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-extrabold">{peso2(d.margin)}</div>
              <Pill tone={marginTone(d.marginRatio)} className="mt-0.5">
                {Math.round(d.marginRatio * 100)}% margin
              </Pill>
            </div>
          </NavLink>
        ))}
      </section>

      {business && subs.length ? (
        <section aria-labelledby="subs-title" className="flex flex-col">
          <h2 id="subs-title" className="pb-0.5 text-[17px] font-extrabold">
            Cheaper substitutes
          </h2>
          {subs.map((s) => (
            <div key={`${s.dish}-${s.to}`} className="flex items-center gap-3 border-b border-line py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">
                  {shortName(s.from)} → {shortName(s.to)}
                </div>
                <div className="text-[12px] text-muted">in {s.dish}</div>
              </div>
              <div className="text-[15px] font-extrabold text-good">−{peso2(s.save)} an order</div>
            </div>
          ))}
        </section>
      ) : null}

      <p className="text-[12px] leading-[1.5] text-muted">
        Costs include ₱3 gas and extras per order (change it per dish). Margin: green 50% and up, amber 30–49%, red below 30%.
      </p>
    </div>
  );
}

/* ---------- sheets (open while the URL says so, so Back closes them) ---------- */

function EaterySheets() {
  const params = useSearchParams();
  const pathname = usePathname();
  const sheet = pathname === '/eatery' ? params.get('sheet') : null;
  const dishId = params.get('dish');
  const close = useCallback((opts?: { animate?: boolean }) => nav.dismiss('/eatery', opts), []);
  return (
    <>
      <AddDishSheet open={sheet === 'add-dish'} onClose={close} />
      <CookSheet open={sheet === 'cook'} dishId={dishId} onClose={close} />
      <EditDishSheet open={sheet === 'edit'} dishId={dishId} onClose={close} />
    </>
  );
}

function AddDishSheet({ open, onClose }: { open: boolean; onClose: (o?: { animate?: boolean }) => void }) {
  const { dishes, recipes } = useEatery();
  const [tier] = usePlanTier();
  const onMenu = new Set(dishes.map((d) => d.recipe.id));
  const choices = [...recipes.values()].filter((r) => r.mealType === 'ulam' && !onMenu.has(r.id)).sort((a, b) => a.name.localeCompare(b.name));
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [grams, setGrams] = useState('');
  const recipe = recipeId ? recipes.get(recipeId) : undefined;

  useEffect(() => {
    if (!open) {
      setRecipeId(null);
      setPrice('');
      setGrams('');
    }
  }, [open]);

  const pick = (id: string) => {
    const r = recipes.get(id)!;
    setRecipeId(id);
    setPrice(String(r.defaultPrice ?? 60));
    setGrams(String(r.orderG ?? 150));
  };
  const p = toNumber(price);
  const g = toNumber(grams);
  const valid = !!recipe && p > 0 && g > 0;
  const limit = tier === 'free' && dishes.length >= FREE_DISH_LIMIT;

  return (
    <Sheet open={open} title="Add a dish" onClose={onClose}>
      {limit ? (
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-[14px] leading-[1.45] text-muted">The free plan covers {FREE_DISH_LIMIT} dishes. The Business plan costs as many as you cook.</p>
          <Button onClick={() => nav.replace('/business', 'sheet-up')}>See the Business plan</Button>
        </div>
      ) : (
        <form
          className="flex min-h-0 flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid || !recipe) return;
            await addDish(recipe, p, g);
            onClose();
          }}
        >
          <div role="radiogroup" aria-label="Dish" className="-mx-5 max-h-[38vh] overflow-y-auto px-5">
            {choices.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={r.id === recipeId}
                onClick={() => pick(r.id)}
                className={cn(
                  'flex min-h-12 w-full items-center justify-between gap-3 border-b border-line py-2 text-left text-[15px] font-bold',
                  r.id === recipeId && 'text-ink',
                )}
              >
                {r.name}
                <span
                  aria-hidden="true"
                  className={cn('size-5 flex-none rounded-full border-2', r.id === recipeId ? 'border-[6px] border-ink' : 'border-check-border')}
                />
              </button>
            ))}
          </div>
          {recipe ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Sells for" prefix="₱" value={price} onChange={setPrice} />
              <NumberField label="One order" suffix="g" value={grams} onChange={setGrams} />
            </div>
          ) : null}
          <Button type="submit" disabled={!valid} className="disabled:opacity-40">
            Add dish
          </Button>
        </form>
      )}
    </Sheet>
  );
}

function CookSheet({ open, dishId, onClose }: { open: boolean; dishId: string | null; onClose: (o?: { animate?: boolean }) => void }) {
  const { dishes } = useEatery();
  const dish = dishes.find((d) => d.item.id === dishId);
  const [value, setValue] = useState('');
  useEffect(() => {
    if (!open) setValue('');
  }, [open]);
  const kgCooked = toNumber(value);
  const valid = kgCooked > 0 && kgCooked <= 200;
  const orders = dish && valid ? Math.round(kgCooked / (dish.orderG / 1000)) : 0;

  return (
    <Sheet open={open && !!dish} title={dish ? `Cook ${dish.recipe.name}` : 'Cook a pot'} onClose={onClose}>
      {dish ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            await cookPot(dish.item.id, kgCooked);
            onClose();
          }}
        >
          <NumberField
            label="How many kilos in the pot?"
            suffix="kg"
            decimal
            value={value}
            onChange={setValue}
            hint={valid ? `About ${orders} orders of ${Math.round(dish.orderG)} g · costs ${peso(orders * dish.cost)}` : undefined}
          />
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValue(String(v))}
                aria-pressed={kgCooked === v}
                className={cn(
                  'press hit h-10 rounded-full border border-track-strong px-4 text-[14px] font-bold text-ink',
                  kgCooked === v ? 'bg-brand' : 'bg-white',
                )}
              >
                {v} kg
              </button>
            ))}
          </div>
          <Button type="submit" disabled={!valid} className="disabled:opacity-40">
            Start the pot
          </Button>
        </form>
      ) : null}
    </Sheet>
  );
}

function EditDishSheet({ open, dishId, onClose }: { open: boolean; dishId: string | null; onClose: (o?: { animate?: boolean }) => void }) {
  const { dishes } = useEatery();
  const dish = dishes.find((d) => d.item.id === dishId);
  const [form, setForm] = useState({ price: '', grams: '', late: '', extras: '' });
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (open && dish)
      setForm({
        price: String(dish.item.price),
        grams: String(dish.item.orderG),
        late: dish.item.latePrice ? String(dish.item.latePrice) : '',
        extras: String(dish.item.extras),
      });
    if (!open) setConfirm(false);
    // Fill the form when the sheet opens for a dish (not on every price refresh).
  }, [open, dish?.item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const price = toNumber(form.price);
  const grams = toNumber(form.grams);
  const late = toNumber(form.late);
  const extras = toNumber(form.extras);
  const valid = price > 0 && grams > 0 && extras >= 0 && (Number.isNaN(late) || late > 0);

  return (
    <Sheet open={open && !!dish} title={dish?.recipe.name ?? 'Dish'} onClose={onClose}>
      {dish ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            await updateDish(dish.item.id, { price, orderG: grams, latePrice: Number.isNaN(late) ? null : late, extras });
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Sells for" prefix="₱" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <NumberField label="One order" suffix="g" value={form.grams} onChange={(v) => setForm({ ...form, grams: v })} />
            <NumberField label="Late price (after 6 pm)" prefix="₱" value={form.late} onChange={(v) => setForm({ ...form, late: v })} />
            <NumberField label="Gas and extras" prefix="₱" suffix="/order" decimal value={form.extras} onChange={(v) => setForm({ ...form, extras: v })} />
          </div>
          <Button type="submit" disabled={!valid} className="disabled:opacity-40">
            Save
          </Button>
          {confirm ? (
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-bad-bg px-3.5 py-2.5">
              <span className="text-[14px] font-bold text-bad">Remove {dish.recipe.name} and its pots?</span>
              <button
                type="button"
                onClick={async () => {
                  await removeDish(dish.item.id);
                  onClose();
                }}
                className="press h-10 rounded-[12px] bg-bad px-3.5 text-[14px] font-extrabold text-white"
              >
                Remove
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="press hit self-center py-1 text-[14px] font-bold text-bad underline underline-offset-3">
              Remove from the menu
            </button>
          )}
        </form>
      ) : null}
    </Sheet>
  );
}


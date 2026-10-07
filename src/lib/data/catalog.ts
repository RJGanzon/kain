'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { backendConfigured, supabase } from '@/lib/supabase/client';
import { useMarket } from '@/lib/store/device';
import { db, type CachedPrice } from './db';
import { bundledCatalog, DEFAULT_MARKET_ID } from './seed';
import type { Catalog, Ingredient, Market, Price, Recipe } from './types';

/**
 * The price catalog for the chosen market. Renders at once from the copy on
 * the phone (or the bundled sample), then refreshes from the server when
 * online, at most every 6 hours (KAIN_BUILD_PROMPT §9).
 */

export const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

let current: Catalog = bundledCatalog(DEFAULT_MARKET_ID);
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = current;

function publish(next: Catalog) {
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCatalog(): Catalog {
  return current;
}

interface CatalogMeta {
  syncedAt: number;
  sample: boolean;
}

async function readCached(marketId: string): Promise<Catalog | null> {
  const d = db();
  if (!d) return null;
  const meta = (await d.meta.get(`catalog:${marketId}`))?.value as CatalogMeta | undefined;
  if (!meta) return null;
  const [markets, ingredients, recipes, prices] = await Promise.all([
    d.markets.toArray(),
    d.ingredients.toArray(),
    d.recipes.toArray(),
    d.prices.where('marketId').equals(marketId).toArray(),
  ]);
  if (!ingredients.length || !recipes.length || !prices.length) return null;
  return {
    marketId,
    markets,
    ingredients,
    recipes,
    prices: Object.fromEntries(prices.map(({ marketId: _m, ...p }) => [p.ingredientId, p])),
    substituteGroups: bundledCatalog().substituteGroups,
    sample: meta.sample,
    source: 'server',
    syncedAt: meta.syncedAt,
  };
}

/** Fetch the catalog for a market from Supabase and keep a copy on the phone. */
export async function fetchCatalog(marketId: string): Promise<Catalog> {
  const sb = supabase();
  if (!sb) throw new Error('No backend configured');
  const [m, i, r, ri, p, f] = await Promise.all([
    sb.from('markets').select('id, name, city').order('name'),
    sb.from('ingredients').select('*'),
    sb.from('recipes').select('*'),
    sb.from('recipe_items').select('*'),
    sb.from('current_prices').select('*').eq('market_id', marketId),
    sb.from('app_flags').select('key, enabled'),
  ]);
  for (const res of [m, i, r, ri, p, f]) if (res.error) throw res.error;

  const markets: Market[] = m.data!;
  const ingredients: Ingredient[] = i.data!.map((x) => ({
    id: x.id,
    name: x.name,
    aliases: x.aliases,
    category: x.category as Ingredient['category'],
    unit: x.unit,
    gramsPerUnit: Number(x.grams_per_unit),
    ediblePortion: Number(x.edible_portion),
    nutrients: x.nutrients as unknown as Ingredient['nutrients'],
  }));
  const items = ri.data!;
  const recipes: Recipe[] = r.data!.map((x) => ({
    id: x.id,
    name: x.name,
    mealType: x.meal_type,
    riceG: Number(x.rice_g),
    defaultPrice: x.default_price === null ? null : Number(x.default_price),
    orderG: x.order_g === null ? null : Number(x.order_g),
    items: items.filter((it) => it.recipe_id === x.id).map((it) => ({ ingredientId: it.ingredient_id, qty: Number(it.qty) })),
  }));
  const prices: Price[] = p.data!.flatMap((x) =>
    x.ingredient_id && x.price !== null && x.observed_at && x.source_tier
      ? [
          {
            ingredientId: x.ingredient_id,
            price: Number(x.price),
            observedAt: x.observed_at,
            tier: x.source_tier,
            prevPrice: x.prev_price === null ? null : Number(x.prev_price),
            prevObservedAt: x.prev_observed_at,
          },
        ]
      : [],
  );
  const sample = f.data!.find((x) => x.key === 'sample_prices')?.enabled ?? false;
  const syncedAt = Date.now();

  const d = db();
  if (d) {
    await d.transaction('rw', [d.markets, d.ingredients, d.recipes, d.prices, d.meta], async () => {
      await Promise.all([d.markets.clear(), d.ingredients.clear(), d.recipes.clear()]);
      await d.prices.where('marketId').equals(marketId).delete();
      await d.markets.bulkPut(markets);
      await d.ingredients.bulkPut(ingredients);
      await d.recipes.bulkPut(recipes);
      await d.prices.bulkPut(prices.map((x): CachedPrice => ({ ...x, marketId })));
      await d.meta.put({ key: `catalog:${marketId}`, value: { syncedAt, sample } satisfies CatalogMeta });
    });
  }
  return {
    marketId,
    markets,
    ingredients,
    recipes,
    prices: Object.fromEntries(prices.map((x) => [x.ingredientId, x])),
    substituteGroups: bundledCatalog().substituteGroups,
    sample,
    source: 'server',
    syncedAt,
  };
}

let inflight: Promise<void> | null = null;

/** Switch to a market and refresh its prices if they're older than 6 hours. */
export async function activateMarket(marketId: string, { force = false } = {}): Promise<void> {
  if (current.marketId !== marketId) {
    publish((await readCached(marketId)) ?? bundledCatalog(marketId));
  } else if (current.source === 'bundled') {
    const cached = await readCached(marketId);
    if (cached) publish(cached);
  }
  const due = force || current.syncedAt === null || Date.now() - current.syncedAt > REFRESH_EVERY_MS;
  if (!due || !backendConfigured() || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  if (inflight) return inflight;
  inflight = fetchCatalog(marketId)
    .then((fresh) => {
      if (current.marketId === marketId) publish(fresh);
    })
    .catch(() => {
      /* offline or server down: keep what we have; "Prices from …" shows it's old */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The catalog for the chosen market. */
export function useCatalog(): Catalog {
  const [marketId] = useMarket();
  const catalog = useSyncExternalStore(subscribe, getCatalog, () => SERVER_SNAPSHOT);
  useEffect(() => {
    void activateMarket(marketId);
    const onOnline = () => void activateMarket(marketId);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [marketId]);
  return catalog;
}

/** True when prices couldn't be refreshed for over 6 hours, so screens show their date. */
export function isStale(c: Catalog, now = Date.now()): boolean {
  return c.source === 'server' && c.syncedAt !== null && now - c.syncedAt > REFRESH_EVERY_MS;
}

/** The newest price date in the catalog: "Prices from Oct 5". */
export function pricesAsOf(c: Catalog): string | null {
  let latest: string | null = null;
  for (const p of Object.values(c.prices)) if (!latest || p.observedAt > latest) latest = p.observedAt;
  return latest;
}

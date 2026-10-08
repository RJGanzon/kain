'use client';

import { useMemo } from 'react';
import { useMarket } from '@/lib/store/device';
import { bundledCatalog } from './seed';
import type { Catalog } from './types';

/**
 * The price catalog for the chosen market. This build keeps everything on
 * the phone: prices and recipes ship with the app (sample estimates, shown
 * with a "Sample data" label), and the phone's own purchase logs update
 * them (see usePrices).
 */

export const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

const byMarket = new Map<string, Catalog>();

export function catalogFor(marketId: string): Catalog {
  let c = byMarket.get(marketId);
  if (!c) {
    c = bundledCatalog(marketId);
    byMarket.set(marketId, c);
  }
  return c;
}

/** The catalog for the chosen market. */
export function useCatalog(): Catalog {
  const [marketId] = useMarket();
  return useMemo(() => catalogFor(marketId), [marketId]);
}

/** Prices bundled with the app never go stale the way fetched ones do. */
export function isStale(c: Catalog, now = Date.now()): boolean {
  return c.source === 'server' && c.syncedAt !== null && now - c.syncedAt > REFRESH_EVERY_MS;
}

/** The newest price date in the catalog: "Prices from Oct 5". */
export function pricesAsOf(c: Catalog): string | null {
  let latest: string | null = null;
  for (const p of Object.values(c.prices)) if (!latest || p.observedAt > latest) latest = p.observedAt;
  return latest;
}

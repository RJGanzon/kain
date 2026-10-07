'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { manilaToday } from '@/components/ui/PriceLabels';
import { db, type PurchaseLog } from '@/lib/data/db';
import type { Catalog, Price } from '@/lib/data/types';

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function rank(tier: Price['tier']): number {
  return tier === 'contributor' || tier === 'user_log' ? 1 : tier === 'da_market' ? 2 : tier === 'da_avg' ? 3 : 4;
}

/**
 * Prices with this phone's own accepted purchase logs on top, by the same
 * rule as the server's current_prices: a log from the last 14 days is a
 * tier-1 price (like a contributor's), and the newest tier-1 price wins.
 * Unusual (flagged) logs never change a price.
 */
export function withLogs(prices: Record<string, Price>, logs: PurchaseLog[], marketId: string, now = Date.now()): Record<string, Price> {
  const out = { ...prices };
  const recent = logs
    .filter((l) => l.status === 'accepted' && l.marketId === marketId && now - l.loggedAt <= FOURTEEN_DAYS)
    .sort((a, b) => a.loggedAt - b.loggedAt);
  for (const log of recent) {
    const cur = out[log.ingredientId];
    if (!cur) continue;
    const logDate = manilaToday(new Date(log.loggedAt));
    const curRecent = now - Date.parse(`${cur.observedAt}T00:00:00+08:00`) <= FOURTEEN_DAYS;
    const beats = !curRecent || rank(cur.tier) > 1 || logDate >= cur.observedAt;
    if (beats) out[log.ingredientId] = { ...cur, price: Math.round(log.unitPrice * 100) / 100, observedAt: logDate, tier: 'user_log' };
  }
  return out;
}

const NO_LOGS: PurchaseLog[] = [];

/** The catalog's prices with this phone's purchase logs applied. */
export function usePrices(catalog: Catalog): Record<string, Price> {
  const logs = useLiveQuery(
    async () => (await db()?.logs.where('loggedAt').above(Date.now() - FOURTEEN_DAYS).toArray()) ?? NO_LOGS,
    [],
    NO_LOGS,
  );
  return useMemo(() => withLogs(catalog.prices, logs, catalog.marketId), [catalog, logs]);
}

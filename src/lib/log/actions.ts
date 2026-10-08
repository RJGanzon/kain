'use client';

import { db, newId, type PurchaseLog } from '@/lib/data/db';
import type { Price } from '@/lib/data/types';
import type { ParseResult } from '@/lib/parser/parse';
import { checkPrice } from './price-check';

type Parsed = Extract<ParseResult, { ok: true }>;

/**
 * The market price a log is checked against: the catalog's price, not one
 * of this phone's own logs, so logs can't walk the price away.
 */
export function referencePrice(marketPrices: Record<string, Price>, ingredientId: string): number | null {
  return marketPrices[ingredientId]?.price ?? null;
}

/** Save a purchase on this phone. */
export async function addLog(parsed: Parsed, text: string, marketId: string, reference: number | null): Promise<PurchaseLog> {
  const check = checkPrice(parsed.ingredient.unit, parsed.qty, parsed.price, reference);
  const log: PurchaseLog = {
    id: newId(),
    ingredientId: parsed.ingredient.id,
    qty: parsed.qty,
    totalPrice: parsed.price,
    unitPrice: check.unitPrice,
    refPrice: reference,
    marketId,
    loggedAt: Date.now(),
    status: check.status,
    text,
  };
  await db()?.logs.add(log);
  return log;
}

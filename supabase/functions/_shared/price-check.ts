/**
 * Is a logged price believable? Shared by the app (instant preview, guests)
 * and the log-purchase Edge Function (the decision that counts). No imports,
 * so it runs in both the browser and Deno.
 *
 * Within ±30% of the market price: accepted, and it becomes a "Your log"
 * price. Outside: saved but flagged, never used, so one typo can't move
 * everyone's prices.
 */

export const TOLERANCE = 0.3;

export type Unit = 'kg' | 'L' | 'pc' | 'bundle' | 'can' | 'pack';

/** qty in grams (kg items), ml (L items) or a count → kg, L or units. */
export function toPriceUnits(unit: Unit, qty: number): number {
  return unit === 'kg' || unit === 'L' ? qty / 1000 : qty;
}

export interface PriceCheck {
  unitPrice: number;
  /** unitPrice ÷ reference, or null with no reference. */
  ratio: number | null;
  status: 'accepted' | 'flagged';
}

export function checkPrice(unit: Unit, qty: number, totalPrice: number, reference: number | null | undefined): PriceCheck {
  const units = toPriceUnits(unit, qty);
  const unitPrice = totalPrice / units;
  if (!reference || reference <= 0 || !Number.isFinite(unitPrice)) return { unitPrice, ratio: null, status: 'flagged' };
  const ratio = unitPrice / reference;
  return { unitPrice, ratio, status: ratio >= 1 - TOLERANCE && ratio <= 1 + TOLERANCE ? 'accepted' : 'flagged' };
}

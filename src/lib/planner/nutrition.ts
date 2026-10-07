import type { Category, Ingredient, Unit } from '@/lib/data/types';

/**
 * Simplified daily needs per adult, based on FNRI PDRI ranges (to be refined
 * with age- and sex-specific values). A child aged 4–12 counts as 0.6.
 */
export const NUTRIENTS = [
  { key: 'kcal', label: 'Energy', unit: 'kcal', target: 2000, weight: 1.5 },
  { key: 'protein_g', label: 'Protein', unit: 'g', target: 60, weight: 1.5 },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', target: 18, weight: 1 },
  { key: 'vita_ug', label: 'Vitamin A', unit: 'µg RAE', target: 600, weight: 1 },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', target: 750, weight: 1 },
  { key: 'vitc_mg', label: 'Vitamin C', unit: 'mg', target: 70, weight: 1 },
] as const;

export const CHILD_FACTOR = 0.6;

/** Fish, meat, eggs or canned fish: a day "with fish, meat or eggs" has ≥ 30 g edible of these. */
export const ANIMAL_CATEGORIES: Category[] = ['fish', 'meat', 'egg', 'canned'];

const WEIGHT_SUM = NUTRIENTS.reduce((a, n) => a + n.weight, 0);

/** Adult equivalents: servings per meal. */
export function servings(adults: number, kids: number): number {
  return adults + CHILD_FACTOR * kids;
}

/** Weighted share of daily needs met, each nutrient capped at 100%. */
export function nutritionScore(coverage: number[]): number {
  return NUTRIENTS.reduce((a, n, k) => a + n.weight * Math.min(coverage[k] ?? 0, 1), 0) / WEIGHT_SUM;
}

/** Grams of food in `qty` of an ingredient (qty in grams, ml or units). */
export function grams(ing: Ingredient, qty: number): number {
  if (ing.unit === 'kg') return qty;
  if (ing.unit === 'L') return (qty * ing.gramsPerUnit) / 1000;
  return qty * ing.gramsPerUnit;
}

/** Cost of `qty` (grams, ml or units) at `price` per kg, L or unit. */
export function costOf(unit: Unit, qty: number, price: number): number {
  return unit === 'kg' || unit === 'L' ? (qty / 1000) * price : qty * price;
}

export const UNIT_LABEL: Record<Unit, string> = {
  kg: 'kg',
  L: 'L',
  pc: 'pc',
  bundle: 'tali',
  can: 'can',
  pack: 'pack',
};

/** "₱110 per kg" style suffix: /kg, /L, /pc, /tali, /can, /pack */
export function perUnit(unit: Unit): string {
  return `/${UNIT_LABEL[unit]}`;
}

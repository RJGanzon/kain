import type { Ingredient, Price, Recipe } from '@/lib/data/types';
import { costOf, grams } from '@/lib/planner/nutrition';

/**
 * Eatery maths (KAIN_BUILD_PROMPT §7.3), ported from reference/mvp/app.js.
 * Costs come from the recipe's per-order quantities at today's prices.
 */

export const DEFAULT_EXTRAS = 3;

/** Ingredient cost of one order of a recipe at its default size (no rice). */
export function recipeOrderCost(recipe: Recipe, ingredients: Map<string, Ingredient>, prices: Record<string, Price>): number {
  let cost = 0;
  for (const it of recipe.items) {
    const ing = ingredients.get(it.ingredientId);
    const p = prices[it.ingredientId];
    if (ing && p) cost += costOf(ing.unit, it.qty, p.price);
  }
  return cost;
}

export interface MenuDish {
  recipe: Recipe;
  /** Selling price per order. */
  price: number;
  /** Grams per order. */
  orderG: number;
  /** Gas and extras per order. */
  extras: number;
}

/**
 * Cost of one order: ingredients (scaled if the eatery serves a different
 * order size than the recipe's) plus gas and extras.
 */
export function costPerOrder(dish: MenuDish, ingredients: Map<string, Ingredient>, prices: Record<string, Price>): number {
  const base = recipeOrderCost(dish.recipe, ingredients, prices);
  const scale = dish.recipe.orderG ? dish.orderG / dish.recipe.orderG : 1;
  return base * scale + dish.extras;
}

export interface PotInput {
  cookedKg: number;
  /** kg per order */
  orderKg: number;
  /** price per order */
  price: number;
  /** all-in cost per order (ingredients + extras) */
  cost: number;
  /** orders sold so far (sum of sales) */
  sold: number;
}

export interface PotNumbers {
  orders: number;
  sold: number;
  left: number;
  soldKg: number;
  leftKg: number;
  potCost: number;
  sales: number;
  /** Sales so far − cost of the whole pot. */
  profitNow: number;
  /** All orders sold − cost of the whole pot. */
  ifAllSells: number;
  /** Orders needed to cover the pot. */
  breakEven: number;
}

export function potNumbers(p: PotInput): PotNumbers {
  const orders = Math.round(p.cookedKg / p.orderKg);
  const sold = Math.max(0, Math.min(orders, p.sold));
  const potCost = orders * p.cost;
  const sales = sold * p.price;
  return {
    orders,
    sold,
    left: orders - sold,
    soldKg: sold * p.orderKg,
    leftKg: Math.max(0, p.cookedKg - sold * p.orderKg),
    potCost,
    sales,
    profitNow: sales - potCost,
    ifAllSells: orders * p.price - potCost,
    breakEven: p.price > 0 ? Math.ceil(potCost / p.price - 1e-9) : orders,
  };
}

export interface DayTotals {
  cookedKg: number;
  soldKg: number;
  leftKg: number;
  sales: number;
  /** Cost of everything cooked today: unsold food counts as cost. */
  cost: number;
  profitNow: number;
  ifAllSells: number;
  /** What the food still in the pots sells for. */
  leftValue: number;
}

export function dayTotals(pots: PotInput[]): DayTotals {
  const t = { cookedKg: 0, soldKg: 0, leftKg: 0, sales: 0, cost: 0, full: 0 };
  for (const p of pots) {
    const n = potNumbers(p);
    t.cookedKg += p.cookedKg;
    t.soldKg += n.soldKg;
    t.leftKg += n.leftKg;
    t.sales += n.sales;
    t.cost += n.potCost;
    t.full += n.orders * p.price;
  }
  return {
    cookedKg: t.cookedKg,
    soldKg: t.soldKg,
    leftKg: t.leftKg,
    sales: t.sales,
    cost: t.cost,
    profitNow: t.sales - t.cost,
    ifAllSells: t.full - t.cost,
    leftValue: t.full - t.sales,
  };
}

export interface SpikeAlert {
  ingredientId: string;
  /** Change vs 4 weeks ago (0.41 = up 41%). */
  change: number;
  /** Most it adds to one serving, and in which dish. */
  perServing: number;
  worstDish: string;
  dishes: string[];
}

/** Ingredients the menu uses that are up 15% or more vs 4 weeks ago, biggest first. */
export function spikeAlerts(menu: MenuDish[], ingredients: Map<string, Ingredient>, prices: Record<string, Price>, threshold = 0.15): SpikeAlert[] {
  const used = new Set(menu.flatMap((d) => d.recipe.items.map((i) => i.ingredientId)));
  const out: SpikeAlert[] = [];
  for (const id of used) {
    const p = prices[id];
    const ing = ingredients.get(id);
    if (!p || !ing || !p.prevPrice) continue;
    const change = (p.price - p.prevPrice) / p.prevPrice;
    if (change < threshold) continue;
    let perServing = 0;
    let worstDish = '';
    const dishes: string[] = [];
    for (const d of menu) {
      const item = d.recipe.items.find((i) => i.ingredientId === id);
      if (!item) continue;
      dishes.push(d.recipe.name);
      const scale = d.recipe.orderG ? d.orderG / d.recipe.orderG : 1;
      const delta = (costOf(ing.unit, item.qty, p.price) - costOf(ing.unit, item.qty, p.prevPrice)) * scale;
      if (delta > perServing) {
        perServing = delta;
        worstDish = d.recipe.name;
      }
    }
    out.push({ ingredientId: id, change, perServing, worstDish, dishes });
  }
  return out.sort((a, b) => b.change - a.change);
}

export interface Substitute {
  dish: string;
  from: string;
  to: string;
  /** Saved per order. */
  save: number;
}

/**
 * Cheaper stand-ins from the same group (galunggong/bangus/tilapia;
 * kangkong/pechay/malunggay; sitaw/okra; repolyo/pechay), compared by cost
 * per edible gram. Suggested when it saves at least 10% and more than ₱0.50.
 */
export function substitutes(
  menu: MenuDish[],
  ingredients: Map<string, Ingredient>,
  prices: Record<string, Price>,
  groups: string[][],
): Substitute[] {
  const out: Substitute[] = [];
  for (const d of menu) {
    const scale = d.recipe.orderG ? d.orderG / d.recipe.orderG : 1;
    for (const item of d.recipe.items) {
      const group = groups.find((g) => g.includes(item.ingredientId));
      const ing = ingredients.get(item.ingredientId);
      const p = prices[item.ingredientId];
      if (!group || !ing || !p) continue;
      const edible = grams(ing, item.qty) * ing.ediblePortion;
      const nowCost = costOf(ing.unit, item.qty, p.price) * scale;
      for (const altId of group) {
        if (altId === item.ingredientId || d.recipe.items.some((i) => i.ingredientId === altId)) continue;
        const alt = ingredients.get(altId);
        const ap = prices[altId];
        if (!alt || !ap) continue;
        const altQty = alt.unit === 'kg' || alt.unit === 'L' ? edible / alt.ediblePortion : edible / (alt.gramsPerUnit * alt.ediblePortion);
        const altCost = costOf(alt.unit, altQty, ap.price) * scale;
        const save = nowCost - altCost;
        if (save > 0.5 && save / nowCost >= 0.1) out.push({ dish: d.recipe.name, from: ing.name, to: alt.name, save });
      }
    }
  }
  return out.sort((a, b) => b.save - a.save).slice(0, 4);
}

/** Margin colour: 50% and up good, 30–49% warn, below 30% bad. */
export function marginTone(ratio: number): 'good' | 'warn' | 'bad' {
  return ratio >= 0.5 ? 'good' : ratio >= 0.3 ? 'warn' : 'bad';
}

/** A late price about 70% of the normal one, rounded to ₱5. */
export function defaultLatePrice(price: number): number {
  return Math.max(5, Math.round((price * 0.7) / 5) * 5);
}

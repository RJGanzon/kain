import type { Category, Ingredient, Price, Recipe } from '@/lib/data/types';
import { ANIMAL_CATEGORIES, costOf, grams, NUTRIENTS, nutritionScore, servings } from './nutrition';

/**
 * The family planner (KAIN_BUILD_PROMPT §7.1), ported from reference/mvp/app.js.
 * Deterministic: no randomness, recipes are taken in id order, so the same
 * inputs always give the same plan. Runs in a Web Worker in the app.
 */

export interface PlanInput {
  budget: number;
  adults: number;
  kids: number;
  days: 1 | 7;
}

export interface PlanCatalog {
  ingredients: Ingredient[];
  recipes: Recipe[];
  prices: Record<string, Price>;
}

export interface DishStats {
  /** Per serving, rice included. */
  cost: number;
  /** Per serving: kcal, protein, iron, vitamin A, calcium, vitamin C. */
  nutrients: number[];
  /** Edible grams per serving from fish, meat, eggs or canned fish. */
  animalG: number;
  /** Per-serving quantities, rice included. */
  items: Record<string, number>;
}

export interface PlanDay {
  breakfast: string;
  lunch: string;
  dinner: string;
  /** For the whole family. */
  cost: number;
  /** Share of daily needs met, per nutrient (1 = 100%). */
  coverage: number[];
  /** No combination fits the budget: this is the cheapest one. */
  over: boolean;
  animalDay: boolean;
}

export interface ShopItem {
  ingredientId: string;
  name: string;
  category: Category;
  /** What the plan uses (grams, ml or units). */
  need: number;
  /** What to buy after rounding up. */
  buy: number;
  label: string;
  cost: number;
  /** Whole units left after the plan (eggs, cans, tali, packs). */
  leftOver: number;
  /** The price used, for its source tier and date. */
  price: Price;
}

export interface Plan {
  input: PlanInput;
  servings: number;
  days: PlanDay[];
  dishes: Record<string, DishStats>;
  /** Sum of the days' costs. */
  total: number;
  budgetTotal: number;
  shop: ShopItem[];
  shopTotal: number;
  /** Daily average coverage per nutrient. */
  average: number[];
  /** Share of the budget the meal search allowed (see planWithinBudget). */
  headroom: number;
}

const RICE_ID = 'bigas';
const BREAKFAST_CAP = 3;
const ULAM_CAP = 2;

export function dishStats(recipe: Recipe, catalog: PlanCatalog, ing: Map<string, Ingredient>): DishStats {
  const items: Record<string, number> = {};
  for (const it of recipe.items) items[it.ingredientId] = (items[it.ingredientId] ?? 0) + it.qty;
  if (recipe.riceG > 0) items[RICE_ID] = (items[RICE_ID] ?? 0) + recipe.riceG;
  let cost = 0;
  let animalG = 0;
  const nutrients = [0, 0, 0, 0, 0, 0];
  for (const [id, qty] of Object.entries(items)) {
    const i = ing.get(id);
    const p = catalog.prices[id];
    if (!i || !p) continue;
    cost += costOf(i.unit, qty, p.price);
    const edible = grams(i, qty) * i.ediblePortion;
    NUTRIENTS.forEach((n, k) => (nutrients[k] += (edible / 100) * i.nutrients[n.key]));
    if (ANIMAL_CATEGORIES.includes(i.category)) animalG += edible;
  }
  return { cost, nutrients, animalG, items };
}

function byId(a: { id: string }, b: { id: string }) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** One pass of the meal search with a given budget headroom. */
export function makePlan(catalog: PlanCatalog, input: PlanInput, headroom = 0.96): Plan {
  const ing = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const recipes = [...catalog.recipes].sort(byId);
  const dishes: Record<string, DishStats> = {};
  for (const r of recipes) dishes[r.id] = dishStats(r, catalog, ing);

  const ae = servings(input.adults, input.kids);
  const weights = NUTRIENTS.map((n) => n.weight);
  const wsum = weights.reduce((a, w) => a + w, 0);
  const B = recipes.filter((r) => r.mealType === 'breakfast').map((r) => r.id);
  const U = recipes.filter((r) => r.mealType === 'ulam').map((r) => r.id);
  const cov = (b: string, l: string, d: string) =>
    NUTRIENTS.map((n, k) => (dishes[b].nutrients[k] + dishes[l].nutrients[k] + dishes[d].nutrients[k]) / n.target);

  const uses: Record<string, number> = {};
  const days: PlanDay[] = [];
  for (let day = 0; day < input.days; day++) {
    let best: { b: string; l: string; d: string; cost: number; coverage: number[]; score: number } | null = null;
    for (const relax of [false, true]) {
      for (const b of B) {
        if (!relax && (uses[b] ?? 0) >= BREAKFAST_CAP) continue;
        for (let i = 0; i < U.length; i++) {
          for (let j = i + 1; j < U.length; j++) {
            const l = U[i];
            const d = U[j];
            if (!relax && ((uses[l] ?? 0) >= ULAM_CAP || (uses[d] ?? 0) >= ULAM_CAP)) continue;
            const cost = (dishes[b].cost + dishes[l].cost + dishes[d].cost) * ae;
            if (cost > input.budget * headroom) continue;
            const coverage = cov(b, l, d);
            let score = coverage.reduce((a, v, k) => a + weights[k] * Math.min(v, 1), 0) / wsum;
            score -= 0.04 * (uses[b] ?? 0) + 0.08 * ((uses[l] ?? 0) + (uses[d] ?? 0));
            score -= 0.01 * (cost / input.budget);
            if (!best || score > best.score + 1e-9) best = { b, l, d, cost, coverage, score };
          }
        }
      }
      if (best) break;
    }
    let over = false;
    if (!best) {
      // Budget too small for any combination: take the cheapest day and flag it.
      over = true;
      for (const b of B)
        for (let i = 0; i < U.length; i++)
          for (let j = i + 1; j < U.length; j++) {
            const cost = (dishes[b].cost + dishes[U[i]].cost + dishes[U[j]].cost) * ae;
            if (!best || cost < best.cost - 1e-9) best = { b, l: U[i], d: U[j], cost, coverage: cov(b, U[i], U[j]), score: 0 };
          }
    }
    if (!best) throw new Error('The catalog has no breakfast or ulam recipes');
    // The cheaper ulam at lunch, the other at dinner.
    let { l, d } = best;
    if (dishes[l].cost > dishes[d].cost) [l, d] = [d, l];
    for (const id of [best.b, l, d]) uses[id] = (uses[id] ?? 0) + 1;
    days.push({
      breakfast: best.b,
      lunch: l,
      dinner: d,
      cost: best.cost,
      coverage: best.coverage,
      over,
      animalDay: [best.b, l, d].some((id) => dishes[id].animalG >= 30),
    });
  }

  const shop = shoppingList(days, dishes, ae, catalog, ing);
  const total = days.reduce((a, d) => a + d.cost, 0);
  return {
    input,
    servings: ae,
    days,
    dishes,
    total,
    budgetTotal: input.budget * input.days,
    shop,
    shopTotal: shop.reduce((a, s) => a + s.cost, 0),
    average: NUTRIENTS.map((_, k) => days.reduce((a, d) => a + d.coverage[k], 0) / days.length),
    headroom,
  };
}

const COUNT_WORD: Record<string, [string, string]> = {
  pc: ['pc', 'pcs'],
  bundle: ['tali', 'tali'],
  can: ['can', 'cans'],
  pack: ['pack', 'packs'],
};

/**
 * Shopping list: kg items round up to 50 g; L items (oil, toyo, suka, patis)
 * round up to 10 ml, bought as tingi; count items round up to whole units.
 */
export function shoppingList(
  days: PlanDay[],
  dishes: Record<string, DishStats>,
  ae: number,
  catalog: PlanCatalog,
  ing: Map<string, Ingredient>,
): ShopItem[] {
  const need = new Map<string, number>();
  for (const d of days)
    for (const id of [d.breakfast, d.lunch, d.dinner])
      for (const [iid, q] of Object.entries(dishes[id].items)) need.set(iid, (need.get(iid) ?? 0) + q * ae);

  const out: ShopItem[] = [];
  for (const [id, q] of [...need.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const i = ing.get(id);
    const price = catalog.prices[id];
    if (!i || !price) continue;
    let buy: number;
    let label: string;
    let leftOver = 0;
    if (i.unit === 'kg') {
      buy = Math.max(50, Math.ceil(q / 50 - 1e-9) * 50);
      label = buy >= 1000 ? `${(buy / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${buy} g`;
    } else if (i.unit === 'L') {
      buy = Math.ceil(q / 10 - 1e-9) * 10;
      label = `${buy} ml (tingi)`;
    } else {
      buy = Math.ceil(q - 1e-9);
      const [one, many] = COUNT_WORD[i.unit];
      label = `${buy} ${buy === 1 ? one : many}`;
      leftOver = buy - q > 0.05 ? Math.round((buy - q) * 10) / 10 : 0;
    }
    out.push({ ingredientId: id, name: i.name, category: i.category, need: q, buy, label, cost: costOf(i.unit, buy, price.price), leftOver, price });
  }
  return out;
}

/**
 * The plan used by the app. Whole packs can push the rounded shopping list
 * over budget on small plans, so when that happens the search runs again
 * with 2 points less headroom (0.94, 0.92, …) until the list fits or a day
 * is flagged "Budget too small" (docs/PLAN.md decision A). Plans that
 * already fit are unchanged.
 */
export function planWithinBudget(catalog: PlanCatalog, input: PlanInput): Plan {
  let plan = makePlan(catalog, input, 0.96);
  for (let step = 1; step <= 23; step++) {
    if (plan.days.some((d) => d.over) || plan.shopTotal <= plan.budgetTotal + 1e-9) return plan;
    plan = makePlan(catalog, input, Math.round((0.96 - 0.02 * step) * 100) / 100);
  }
  return plan;
}

/** Weighted nutrition met across the plan (Today's ring). */
export function planScore(plan: Plan): number {
  return nutritionScore(plan.average);
}

/** Cheapest day's cost, for "Budget too small. The cheapest plan costs ₱X a day." */
export function cheapestDayCost(plan: Plan): number {
  return Math.min(...plan.days.map((d) => d.cost));
}

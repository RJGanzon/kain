import { describe, expect, it } from 'vitest';
import { bundledCatalog } from '@/lib/data/seed';
import { makePlan, planWithinBudget, type PlanCatalog, type PlanInput } from './planner';

const catalog: PlanCatalog = bundledCatalog();
const name = (id: string) => catalog.recipes.find((r) => r.id === id)!.name;
const DESIGN: PlanInput = { budget: 350, adults: 2, kids: 3, days: 7 };

describe('family planner', () => {
  it('gives the same plan for the same inputs, whatever order the recipes arrive in', () => {
    const a = planWithinBudget(catalog, DESIGN);
    const b = planWithinBudget(catalog, DESIGN);
    const shuffled = { ...catalog, recipes: [...catalog.recipes].reverse(), ingredients: [...catalog.ingredients].reverse() };
    const c = planWithinBudget(shuffled, DESIGN);
    expect(b).toEqual(a);
    expect(c.days).toEqual(a.days);
    expect(c.shop).toEqual(a.shop);
  });

  it("reproduces the design's day 1 for ₱350, 2 adults, 3 kids", () => {
    const plan = planWithinBudget(catalog, DESIGN);
    const d1 = plan.days[0];
    expect([name(d1.breakfast), name(d1.lunch), name(d1.dinner)]).toEqual([
      'Sardinas na may Itlog',
      'Adobong Atay at Patatas',
      "Tokwa't Gulay",
    ]);
    expect(Math.round(d1.cost)).toBe(291);
    expect(plan.servings).toBeCloseTo(3.8);
  });

  it('matches the reference MVP exactly on the same prices', () => {
    // The MVP applies its example purchase logs, which move bangus to ₱240.
    const mvpPrices = { ...catalog.prices, bangus: { ...catalog.prices.bangus, price: 240 } };
    const plan = planWithinBudget({ ...catalog, prices: mvpPrices }, DESIGN);
    expect(plan.days.map((d) => `${d.breakfast}/${d.lunch}/${d.dinner} ${Math.round(d.cost)}`)).toEqual([
      'sardinasb/atay/tokwa 291',
      'pandesal/akangkong/gsardinas 258',
      'kamote/munggo/ampalaya 250',
      'sardinasb/atay/pinakbet 305',
      'sinangag/ginataan/tokwa 261',
      'lugaw/akangkong/menudo 327',
      'kamote/gsardinas/tinola 323',
    ]);
    expect(plan.shop).toHaveLength(31);
    expect(plan.shopTotal).toBeCloseTo(2122.1, 2);
  });

  it('keeps the shopping total within the budget whenever no day is flagged', () => {
    let checked = 0;
    for (const days of [1, 7] as const)
      for (let budget = 150; budget <= 800; budget += 50)
        for (let adults = 1; adults <= 6; adults++)
          for (let kids = 0; kids <= 6; kids++) {
            const plan = planWithinBudget(catalog, { budget, adults, kids, days });
            if (plan.days.some((d) => d.over)) continue;
            checked++;
            expect(plan.shopTotal, `${budget}/${adults}/${kids}/${days}`).toBeLessThanOrEqual(plan.budgetTotal + 1e-9);
          }
    expect(checked).toBeGreaterThan(500);
  });

  it('tightens the headroom only when the rounded list would go over', () => {
    expect(planWithinBudget(catalog, DESIGN).headroom).toBe(0.96);
    // A small one-day plan where whole cans and tali push the list over at 0.96.
    const loose = makePlan(catalog, { budget: 150, adults: 1, kids: 0, days: 1 }, 0.96);
    expect(loose.shopTotal).toBeGreaterThan(loose.budgetTotal);
    const fixed = planWithinBudget(catalog, { budget: 150, adults: 1, kids: 0, days: 1 });
    expect(fixed.headroom).toBeLessThan(0.96);
    expect(fixed.days.some((d) => d.over) || fixed.shopTotal <= fixed.budgetTotal).toBe(true);
  });

  it('falls back to the cheapest day and flags it when the budget is too small', () => {
    const plan = planWithinBudget(catalog, { budget: 150, adults: 6, kids: 6, days: 7 });
    const over = plan.days.filter((d) => d.over);
    expect(over.length).toBeGreaterThan(0);
    // The flagged day is the cheapest possible combination.
    const dishes = Object.values(plan.dishes);
    const ae = plan.servings;
    const breakfasts = catalog.recipes.filter((r) => r.mealType === 'breakfast').map((r) => plan.dishes[r.id].cost);
    const ulam = catalog.recipes
      .filter((r) => r.mealType === 'ulam')
      .map((r) => plan.dishes[r.id].cost)
      .sort((a, b) => a - b);
    const cheapest = (Math.min(...breakfasts) + ulam[0] + ulam[1]) * ae;
    expect(dishes.length).toBeGreaterThan(0);
    for (const d of over) expect(d.cost).toBeCloseTo(cheapest, 6);
  });

  it('holds the caps: breakfast at most 3 times a week, each ulam at most 2', () => {
    // At ₱250 nothing fits within the caps, so they relax by design (§7.1).
    for (const budget of [350, 500, 800]) {
      const plan = planWithinBudget(catalog, { budget, adults: 2, kids: 3, days: 7 });
      const uses: Record<string, number> = {};
      for (const d of plan.days) for (const id of [d.breakfast, d.lunch, d.dinner]) uses[id] = (uses[id] ?? 0) + 1;
      for (const [id, n] of Object.entries(uses)) {
        const meal = catalog.recipes.find((r) => r.id === id)!.mealType;
        expect(n, `${id} at ₱${budget}`).toBeLessThanOrEqual(meal === 'breakfast' ? 3 : 2);
      }
    }
  });

  it('puts the cheaper ulam at lunch', () => {
    const plan = planWithinBudget(catalog, DESIGN);
    for (const d of plan.days) expect(plan.dishes[d.lunch].cost).toBeLessThanOrEqual(plan.dishes[d.dinner].cost);
  });

  it('rounds the shopping list: 50 g, 10 ml tingi, whole units', () => {
    const plan = planWithinBudget(catalog, DESIGN);
    const unit = (id: string) => catalog.ingredients.find((i) => i.id === id)!.unit;
    for (const s of plan.shop) {
      const u = unit(s.ingredientId);
      expect(s.buy).toBeGreaterThanOrEqual(s.need - 1e-9);
      if (u === 'kg') expect(s.buy % 50).toBe(0);
      else if (u === 'L') {
        expect(s.buy % 10).toBe(0);
        expect(s.label).toMatch(/ml \(tingi\)$/);
      } else expect(Number.isInteger(s.buy)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { bundledCatalog } from '@/lib/data/seed';
import { costPerOrder, dayTotals, defaultLatePrice, marginTone, potNumbers, spikeAlerts, substitutes, type MenuDish, type PotInput } from './math';

/**
 * The sample day from design/Eatery.dc.html. Cost per order is all-in
 * (ingredients + gas and extras), see docs/PLAN.md decision B.
 */
const SAMPLE: Array<PotInput & { name: string; soldKg: number }> = [
  { name: 'Ginisang Munggo', cookedKg: 6.0, soldKg: 4.4, price: 50, cost: 15.68, orderKg: 0.2, sold: 0 },
  { name: 'Adobong Manok', cookedKg: 4.0, soldKg: 3.2, price: 85, cost: 33.17, orderKg: 0.16, sold: 0 },
  { name: 'Pinakbet', cookedKg: 4.5, soldKg: 2.7, price: 60, cost: 30.0, orderKg: 0.18, sold: 0 },
  { name: 'Sinigang na Bangus', cookedKg: 5.0, soldKg: 2.5, price: 90, cost: 48.5, orderKg: 0.25, sold: 0 },
  { name: 'Tortang Talong', cookedKg: 2.4, soldKg: 1.8, price: 50, cost: 21.73, orderKg: 0.12, sold: 0 },
  { name: 'Pritong Galunggong', cookedKg: 2.4, soldKg: 1.8, price: 75, cost: 41.95, orderKg: 0.12, sold: 0 },
].map((d) => ({ ...d, sold: Math.round(d.soldKg / d.orderKg) }));

const peso = (v: number) => Math.round(v);

describe('eatery maths (§7.3 sample day)', () => {
  const t = dayTotals(SAMPLE);

  it('profit right now ₱2,182: sales minus the cost of everything cooked', () => {
    expect(peso(t.profitNow)).toBe(2182);
    expect(peso(t.sales)).toBe(6475);
    expect(peso(t.cost)).toBe(4293);
  });

  it('if all sells ₱5,132', () => {
    expect(peso(t.ifAllSells)).toBe(5132);
  });

  it('16.4 of 24.3 kg sold; 7.9 kg left worth ₱2,950', () => {
    expect(t.soldKg.toFixed(1)).toBe('16.4');
    expect(t.cookedKg.toFixed(1)).toBe('24.3');
    expect(t.leftKg.toFixed(1)).toBe('7.9');
    expect(peso(t.leftValue)).toBe(2950);
  });

  it('Sinigang na Bangus is ₱70 short of breaking even', () => {
    const n = potNumbers(SAMPLE.find((d) => d.name === 'Sinigang na Bangus')!);
    expect(peso(n.profitNow)).toBe(-70);
    expect(n.orders).toBe(20);
    expect(n.breakEven).toBe(11);
  });

  it('the Adobong Manok pot from design/Pot.dc.html', () => {
    const n = potNumbers(SAMPLE.find((d) => d.name === 'Adobong Manok')!);
    expect([n.orders, n.sold, n.left, n.breakEven]).toEqual([25, 20, 5, 10]);
    expect(peso(n.potCost)).toBe(829);
    expect(peso(n.sales)).toBe(1700);
    expect(peso(n.profitNow)).toBe(871);
    expect(peso(n.ifAllSells)).toBe(1296);
  });

  it('sold orders stay between 0 and the pot', () => {
    const base = SAMPLE[0];
    expect(potNumbers({ ...base, sold: -3 }).sold).toBe(0);
    expect(potNumbers({ ...base, sold: 999 }).sold).toBe(30);
  });
});

describe('menu costing from the catalog', () => {
  const c = bundledCatalog();
  const ing = new Map(c.ingredients.map((i) => [i.id, i]));
  const dish = (id: string, price: number, extras = 3): MenuDish => {
    const recipe = c.recipes.find((r) => r.id === id)!;
    return { recipe, price, orderG: recipe.orderG!, extras };
  };

  it('cost per order = ingredients at today’s prices + ₱3 gas and extras (the design’s figures)', () => {
    expect(costPerOrder(dish('amanok', 85), ing, c.prices)).toBeCloseTo(33.17, 2);
    expect(costPerOrder(dish('munggo', 50), ing, c.prices)).toBeCloseTo(15.68, 1);
    expect(costPerOrder(dish('pinakbet', 60), ing, c.prices)).toBeCloseTo(30.0, 1);
  });

  it('a bigger order costs proportionally more', () => {
    const d = dish('amanok', 85, 0);
    const big = { ...d, orderG: d.orderG * 1.5 };
    expect(costPerOrder(big, ing, c.prices)).toBeCloseTo(costPerOrder(d, ing, c.prices) * 1.5, 6);
  });

  it('spike alert: kamatis is up 41% and adds the most to sinigang and galunggong', () => {
    const menu = [dish('munggo', 50), dish('pinakbet', 60), dish('sinigang', 90), dish('gg', 75)];
    const alerts = spikeAlerts(menu, ing, c.prices);
    const kamatis = alerts.find((a) => a.ingredientId === 'kamatis')!;
    expect(Math.round(kamatis.change * 100)).toBe(41);
    expect(kamatis.dishes).toHaveLength(4);
    expect(kamatis.perServing).toBeCloseTo(1.05, 2);
    // Nothing under 15% is flagged.
    expect(alerts.every((a) => a.change >= 0.15)).toBe(true);
  });

  it('suggests a cheaper fish for sinigang when it saves 10% and over ₱0.50', () => {
    const subs = substitutes([dish('sinigang', 90)], ing, c.prices, c.substituteGroups);
    expect(subs.length).toBeGreaterThan(0);
    for (const s of subs) expect(s.save).toBeGreaterThan(0.5);
    expect(subs.map((s) => `${s.from}→${s.to}`)).toContain('Bangus→Tilapia');
  });

  it('margin colours and the late price', () => {
    expect([marginTone(0.69), marginTone(0.46), marginTone(0.2)]).toEqual(['good', 'warn', 'bad']);
    expect(defaultLatePrice(85)).toBe(60);
  });
});

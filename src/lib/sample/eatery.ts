/**
 * SAMPLE DATA from design/Eatery.dc.html and design/Pot.dc.html.
 * Shown behind a "Sample data" label until Phase 6 wires real menus and pots.
 * cookedKg / soldKg: today's pot; price: per order; cost: ingredient cost per
 * order (all-in, see docs/PLAN.md decision B); orderKg: kg per order.
 */
export interface SampleDish {
  id: string;
  name: string;
  cookedKg: number;
  soldKg: number;
  price: number;
  cost: number;
  orderKg: number;
  latePrice: number;
  cookedAt: string;
}

export const SAMPLE_DISHES: SampleDish[] = [
  { id: 'ginisang-munggo', name: 'Ginisang Munggo', cookedKg: 6.0, soldKg: 4.4, price: 50, cost: 15.68, orderKg: 0.2, latePrice: 35, cookedAt: '9:45 am' },
  { id: 'adobong-manok', name: 'Adobong Manok', cookedKg: 4.0, soldKg: 3.2, price: 85, cost: 33.17, orderKg: 0.16, latePrice: 60, cookedAt: '10:30 am' },
  { id: 'pinakbet', name: 'Pinakbet', cookedKg: 4.5, soldKg: 2.7, price: 60, cost: 30.0, orderKg: 0.18, latePrice: 45, cookedAt: '10:00 am' },
  { id: 'sinigang-na-bangus', name: 'Sinigang na Bangus', cookedKg: 5.0, soldKg: 2.5, price: 90, cost: 48.5, orderKg: 0.25, latePrice: 65, cookedAt: '10:15 am' },
  { id: 'tortang-talong', name: 'Tortang Talong', cookedKg: 2.4, soldKg: 1.8, price: 50, cost: 21.73, orderKg: 0.12, latePrice: 35, cookedAt: '11:00 am' },
  { id: 'pritong-galunggong', name: 'Pritong Galunggong', cookedKg: 2.4, soldKg: 1.8, price: 75, cost: 41.95, orderKg: 0.12, latePrice: 55, cookedAt: '11:15 am' },
];

/** A pot's numbers (the design's sample maths; Phase 6 ports the real costing). */
export function potNumbers(d: SampleDish, soldOrders?: number) {
  const orders = Math.round(d.cookedKg / d.orderKg);
  const sold = Math.max(0, Math.min(orders, soldOrders ?? Math.round(d.soldKg / d.orderKg)));
  const potCost = orders * d.cost;
  const sales = sold * d.price;
  return {
    orders,
    sold,
    left: orders - sold,
    potCost,
    sales,
    profitNow: sales - potCost,
    ifAllSells: orders * d.price - potCost,
    breakEven: Math.ceil(potCost / d.price),
  };
}

/** Today's totals across pots: profit right now counts all food cooked as cost. */
export function dayTotals(dishes: SampleDish[]) {
  let cookedKg = 0;
  let soldKg = 0;
  let sales = 0;
  let cost = 0;
  let full = 0;
  for (const d of dishes) {
    const n = potNumbers(d);
    cookedKg += d.cookedKg;
    soldKg += d.soldKg;
    sales += n.sales;
    cost += n.potCost;
    full += n.orders * d.price;
  }
  return { cookedKg, soldKg, sales, cost, profitNow: sales - cost, ifAllSells: full - cost, leftKg: cookedKg - soldKg, leftValue: full - sales };
}

/** The design's pots list shows the first five dishes. */
export const SAMPLE_POTS = SAMPLE_DISHES.slice(0, 5);

export function sampleDish(id: string): SampleDish | undefined {
  return SAMPLE_DISHES.find((d) => d.id === id);
}

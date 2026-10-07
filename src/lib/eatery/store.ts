'use client';

import { useMemo } from 'react';
import { manilaToday } from '@/components/ui/PriceLabels';
import { useCatalog } from '@/lib/data/catalog';
import { db, newId, type MenuItem, type Pot, type PotSale } from '@/lib/data/db';
import { liveStore } from '@/lib/data/live';
import { enqueue } from '@/lib/data/outbox';
import type { Ingredient, Recipe } from '@/lib/data/types';
import { usePrices } from '@/lib/log/prices';
import { useDeviceState } from '@/lib/store/device';
import { costPerOrder, DEFAULT_EXTRAS, defaultLatePrice, potNumbers, type MenuDish, type PotNumbers } from './math';

/**
 * The eatery's menu, today's pots and their sales, kept on the phone and
 * synced to the account through the outbox (KAIN_BUILD_PROMPT §5.6–5.7).
 */

export const FREE_DISH_LIMIT = 3;

const menuStore = liveStore<MenuItem[]>(async () => (await db()?.menu.orderBy('position').toArray()) ?? [], []);
const potStore = liveStore<Pot[]>(async () => ((await db()?.pots.toArray()) ?? []).sort((a, b) => a.cookedAt - b.cookedAt), []);
const saleStore = liveStore<PotSale[]>(async () => (await db()?.sales.toArray()) ?? [], []);

export function preloadEatery() {
  menuStore.preload();
  potStore.preload();
  saleStore.preload();
}

export type PlanTier = 'free' | 'business';

/** The eatery's plan on this phone (set from the account, or the demo activation). */
export function usePlanTier() {
  return useDeviceState<PlanTier>('kain:plan', 'free');
}

export interface Dish extends MenuDish {
  item: MenuItem;
  /** All-in cost per order at today's prices. */
  cost: number;
  margin: number;
  marginRatio: number;
}

export interface PotView {
  pot: Pot;
  dish: Dish;
  numbers: PotNumbers;
  sales: PotSale[];
}

export interface EateryData {
  dishes: Dish[];
  /** Today's pots, in cooking order. */
  pots: PotView[];
  ingredients: Map<string, Ingredient>;
  recipes: Map<string, Recipe>;
  today: string;
}

export function useEatery(): EateryData {
  const catalog = useCatalog();
  const prices = usePrices(catalog);
  const menu = menuStore.use();
  const pots = potStore.use();
  const sales = saleStore.use();
  return useMemo(() => {
    const ingredients = new Map(catalog.ingredients.map((i) => [i.id, i]));
    const recipes = new Map(catalog.recipes.map((r) => [r.id, r]));
    const dishes: Dish[] = [];
    for (const item of menu) {
      const recipe = recipes.get(item.recipeId);
      if (!recipe) continue;
      const md: MenuDish = { recipe, price: item.price, orderG: item.orderG, extras: item.extras };
      const cost = costPerOrder(md, ingredients, prices);
      dishes.push({ ...md, item, cost, margin: item.price - cost, marginRatio: item.price > 0 ? (item.price - cost) / item.price : 0 });
    }
    const byId = new Map(dishes.map((d) => [d.item.id, d]));
    const today = manilaToday();
    const views: PotView[] = [];
    for (const pot of pots) {
      const dish = byId.get(pot.menuItemId);
      if (!dish || pot.date !== today) continue;
      const potSales = sales.filter((s) => s.potId === pot.id);
      const sold = potSales.reduce((a, s) => a + s.orders, 0);
      views.push({
        pot,
        dish,
        sales: potSales,
        numbers: potNumbers({ cookedKg: pot.cookedKg, orderKg: dish.orderG / 1000, price: dish.price, cost: dish.cost, sold }),
      });
    }
    // In menu order, then cooking order: rows stay put as the day goes on.
    views.sort((a, b) => a.dish.item.position - b.dish.item.position || a.pot.cookedAt - b.pot.cookedAt);
    return { dishes, pots: views, ingredients, recipes, today };
  }, [catalog, prices, menu, pots, sales]);
}

/** A pot by id, any day (for Pot detail). */
export function usePot(id: string | null): PotView | null {
  const data = useEatery();
  const pots = potStore.use();
  const sales = saleStore.use();
  return useMemo(() => {
    if (!id) return null;
    const today = data.pots.find((p) => p.pot.id === id);
    if (today) return today;
    const pot = pots.find((p) => p.id === id);
    const dish = pot ? data.dishes.find((d) => d.item.id === pot.menuItemId) : undefined;
    if (!pot || !dish) return null;
    const potSales = sales.filter((s) => s.potId === id);
    const sold = potSales.reduce((a, s) => a + s.orders, 0);
    return { pot, dish, sales: potSales, numbers: potNumbers({ cookedKg: pot.cookedKg, orderKg: dish.orderG / 1000, price: dish.price, cost: dish.cost, sold }) };
  }, [id, data, pots, sales]);
}

/* ---------- actions ---------- */

export async function addDish(recipe: Recipe, price: number, orderG: number): Promise<MenuItem> {
  const d = db()!;
  const position = (await d.menu.count()) + 1;
  const item: MenuItem = {
    id: newId(),
    recipeId: recipe.id,
    price,
    orderG,
    latePrice: defaultLatePrice(price),
    extras: DEFAULT_EXTRAS,
    position,
    createdAt: Date.now(),
  };
  await d.menu.add(item);
  await enqueue('menu', item.id, item);
  return item;
}

export async function updateDish(id: string, patch: Partial<Pick<MenuItem, 'price' | 'orderG' | 'latePrice' | 'extras'>>): Promise<void> {
  const d = db()!;
  await d.menu.update(id, patch);
  const item = await d.menu.get(id);
  if (item) await enqueue('menu', id, item);
}

export async function removeDish(id: string): Promise<void> {
  const d = db()!;
  await d.transaction('rw', [d.menu, d.pots, d.sales], async () => {
    const pots = await d.pots.where('menuItemId').equals(id).primaryKeys();
    await d.sales.where('potId').anyOf(pots).delete();
    await d.pots.bulkDelete(pots);
    await d.menu.delete(id);
  });
  await enqueue('menu-delete', id, id);
}

export async function cookPot(menuItemId: string, cookedKg: number): Promise<Pot> {
  const pot: Pot = { id: newId(), menuItemId, date: manilaToday(), cookedKg, cookedAt: Date.now() };
  await db()!.pots.add(pot);
  await enqueue('pot', pot.id, pot);
  return pot;
}

export async function removePot(id: string): Promise<void> {
  const d = db()!;
  await d.transaction('rw', [d.pots, d.sales], async () => {
    await d.sales.where('potId').equals(id).delete();
    await d.pots.delete(id);
  });
  await enqueue('pot-delete', id, id);
}

/** +n orders sold, −1 to undo, or a correction (weighing the pot). */
export async function recordSale(potId: string, orders: number): Promise<void> {
  if (!orders) return;
  const sale: PotSale = { id: newId(), potId, orders, createdAt: Date.now() };
  await db()!.sales.add(sale);
  await enqueue('sale', sale.id, sale);
}

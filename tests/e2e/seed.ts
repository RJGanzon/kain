import type { Page } from '@playwright/test';
import { admin } from '../db/local';
import { asEateryOwner, type TestUser } from './account';

/**
 * Puts the design's sample eatery day (design/Eatery.dc.html) into the
 * phone's database: 6 dishes on the Business plan, today's pots, and the
 * orders sold so far. Call after the app has opened once (so the database
 * exists); reloads the page.
 */
export const SAMPLE_DAY = [
  { recipeId: 'munggo', price: 50, orderG: 200, cookedKg: 6.0, sold: 22, at: '09:45' },
  { recipeId: 'amanok', price: 85, orderG: 160, cookedKg: 4.0, sold: 20, at: '10:30' },
  { recipeId: 'pinakbet', price: 60, orderG: 180, cookedKg: 4.5, sold: 15, at: '10:00' },
  { recipeId: 'sinigang', price: 90, orderG: 250, cookedKg: 5.0, sold: 10, at: '10:15' },
  { recipeId: 'torta', price: 50, orderG: 120, cookedKg: 2.4, sold: 15, at: '11:00' },
  { recipeId: 'gg', price: 75, orderG: 120, cookedKg: 2.4, sold: 15, at: '11:15' },
];

/** Users made by seedEateryDay, for cleanup (see removeSeedUsers). */
export const seedUsers: TestUser[] = [];

export async function seedEateryDay(page: Page, opts: { business?: boolean; dishes?: number } = {}): Promise<string[]> {
  const rows = SAMPLE_DAY.slice(0, opts.dishes ?? SAMPLE_DAY.length);
  const owner = await asEateryOwner(page, { business: opts.business ?? true });
  if (owner) seedUsers.push(owner);
  // Ids are made here so the same rows can go to the server too (as the phone's outbox would).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const made = rows.map((r, i) => {
    const cookedAt = new Date(`${today}T${r.at}:00+08:00`).getTime();
    return {
      menu: {
        id: crypto.randomUUID(),
        recipeId: r.recipeId,
        price: r.price,
        orderG: r.orderG,
        latePrice: Math.round((r.price * 0.7) / 5) * 5,
        extras: 3,
        position: i + 1,
        createdAt: cookedAt - 3_600_000,
      },
      pot: { id: crypto.randomUUID(), date: today, cookedKg: r.cookedKg, cookedAt },
      sale: { id: crypto.randomUUID(), orders: r.sold, createdAt: cookedAt + 3_600_000 },
    };
  });
  await page.evaluate(
    (made) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kain');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['menu', 'pots', 'sales'], 'readwrite');
          for (const m of made) {
            tx.objectStore('menu').put(m.menu);
            tx.objectStore('pots').put({ ...m.pot, menuItemId: m.menu.id });
            tx.objectStore('sales').put({ ...m.sale, potId: m.pot.id });
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    made,
  );
  if (owner) {
    const svc = admin();
    const iso = (ms: number) => new Date(ms).toISOString();
    const menu = await svc.from('eatery_menu').insert(
      made.map((m) => ({
        id: m.menu.id,
        user_id: owner.id,
        recipe_id: m.menu.recipeId,
        price: m.menu.price,
        order_g: m.menu.orderG,
        late_price: m.menu.latePrice,
        extras: m.menu.extras,
        position: m.menu.position,
        created_at: iso(m.menu.createdAt),
      })),
    );
    if (menu.error) throw menu.error;
    const pots = await svc
      .from('pots')
      .insert(made.map((m) => ({ id: m.pot.id, user_id: owner.id, menu_item_id: m.menu.id, date: m.pot.date, cooked_kg: m.pot.cookedKg, cooked_at: iso(m.pot.cookedAt) })));
    if (pots.error) throw pots.error;
    const sales = await svc
      .from('pot_sales')
      .insert(made.map((m) => ({ id: m.sale.id, pot_id: m.pot.id, user_id: owner.id, orders: m.sale.orders, created_at: iso(m.sale.createdAt) })));
    if (sales.error) throw sales.error;
  }
  const potIds = made.map((m) => m.pot.id);
  await page.evaluate((b) => localStorage.setItem('kain:plan', JSON.stringify(b ? 'business' : 'free')), opts.business ?? true);
  await page.reload();
  return potIds;
}

/** Remove the accounts seedEateryDay made (call from afterEach). */
export async function removeSeedUsers(): Promise<void> {
  const { removeUser } = await import('./account');
  while (seedUsers.length) await removeUser(seedUsers.pop()!);
}

import type { Page } from '@playwright/test';

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

export async function seedEateryDay(page: Page, opts: { business?: boolean; dishes?: number } = {}): Promise<string[]> {
  const rows = SAMPLE_DAY.slice(0, opts.dishes ?? SAMPLE_DAY.length);
  const potIds = await page.evaluate(
    ({ rows, business }) =>
      new Promise<string[]>((resolve, reject) => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const open = indexedDB.open('kain');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(['menu', 'pots', 'sales', 'outbox'], 'readwrite');
          const ids: string[] = [];
          rows.forEach((r, i) => {
            const menuId = crypto.randomUUID();
            const potId = crypto.randomUUID();
            ids.push(potId);
            const cookedAt = new Date(`${today}T${r.at}:00+08:00`).getTime();
            tx.objectStore('menu').put({ id: menuId, recipeId: r.recipeId, price: r.price, orderG: r.orderG, latePrice: Math.round((r.price * 0.7) / 5) * 5, extras: 3, position: i + 1, createdAt: cookedAt - 3_600_000 });
            tx.objectStore('pots').put({ id: potId, menuItemId: menuId, date: today, cookedKg: r.cookedKg, cookedAt });
            tx.objectStore('sales').put({ id: crypto.randomUUID(), potId, orders: r.sold, createdAt: cookedAt + 3_600_000 });
          });
          tx.oncomplete = () => resolve(ids);
          tx.onerror = () => reject(tx.error);
        };
      }),
    { rows, business: opts.business ?? true },
  );
  await page.evaluate((b) => localStorage.setItem('kain:plan', JSON.stringify(b ? 'business' : 'free')), opts.business ?? true);
  await page.reload();
  return potIds;
}

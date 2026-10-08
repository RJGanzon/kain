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
  await page.evaluate((b) => localStorage.setItem('kain:plan', JSON.stringify(b ? 'business' : 'free')), opts.business ?? true);
  await page.reload();
  return made.map((m) => m.pot.id);
}

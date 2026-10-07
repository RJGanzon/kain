import { expect, test } from '@playwright/test';
import { settled } from './helpers';

/** Phase 3: prices come from Supabase (when configured) and are kept on the phone. */

async function idbCatalog(page: import('@playwright/test').Page, market: string) {
  return page.evaluate(
    (m) =>
      new Promise<{ meta: unknown; prices: number }>((resolve, reject) => {
        const open = indexedDB.open('kain');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(['meta', 'prices'], 'readonly');
          const meta = tx.objectStore('meta').get(`catalog:${m}`);
          const count = tx.objectStore('prices').index('marketId').count(m);
          tx.oncomplete = () => resolve({ meta: meta.result?.value ?? null, prices: count.result });
          tx.onerror = () => reject(tx.error);
        };
      }),
    market,
  );
}

test('prices show their source and date, and the catalog is cached on the phone', async ({ page }) => {
  await page.goto('/prices');
  await settled(page, '/prices');
  const kamatis = page.getByRole('listitem').filter({ hasText: 'Kamatis' });
  await expect(kamatis).toContainText('₱120/kg');
  await expect(kamatis).toContainText('Estimate');
  await expect(kamatis).toContainText('▲ 41%');
  await expect(page.getByRole('listitem')).toHaveCount(36);
  await expect(page.getByText('Sample data').first()).toBeVisible();

  const backend = await page.evaluate(() => Boolean(document.querySelector('meta[name="kain-backend"]')));
  test.skip(!backend, 'no backend configured in this build');
  await expect.poll(async () => (await idbCatalog(page, 'pampang')).prices, { timeout: 15_000 }).toBe(36);
  const cached = await idbCatalog(page, 'pampang');
  expect(cached.meta).toMatchObject({ sample: true });
});

test('switching market loads that market’s prices', async ({ page }) => {
  await page.goto('/plan');
  await settled(page, '/plan');
  await page.getByRole('link', { name: /Change market/ }).click();
  await settled(page, '/plan?sheet=market');
  await page.getByRole('radio', { name: /Anunas Market/ }).click();
  await settled(page, '/plan');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  await expect(page.getByText('Anunas Market · free for everyone')).toBeVisible();
});

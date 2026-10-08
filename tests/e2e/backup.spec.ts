import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { ready, settled } from './helpers';
import { seedEateryDay } from './seed';

/** Everything lives on the phone: save it to a file, wipe the phone, restore it. */

test('save a backup and restore it on a wiped phone', async ({ page }) => {
  await page.goto('/log');
  await settled(page, '/log');
  await ready(page);
  await page.getByLabel('What you bought and how much you paid').fill('2 tali kangkong 40');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Kangkong price added for Pampang Market.')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kain:family', JSON.stringify({ budget: 420, adults: 3, kids: 1, days: 7 })));
  await seedEateryDay(page, { dishes: 2 });

  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await expect(page.getByRole('heading', { name: 'Your data stays on this phone' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a backup' }).click();
  const file = await (await download).path();
  await expect(page.getByText('Backup saved: 1 purchase, 2 dishes, 2 pots.')).toBeVisible();
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup).toMatchObject({ app: 'kain', version: 1, settings: { 'kain:family': { budget: 420 } } });

  // Wipe the phone's Kain data.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        localStorage.clear();
        const req = indexedDB.deleteDatabase('kain');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      }),
  );
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await expect(page.locator('output[for="budget-range"]')).toHaveText('₱350');

  await page.getByLabel('Backup file to restore').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Restored 1 purchase, 2 dishes and 2 pots.')).toBeVisible();
  await expect(page.locator('output[for="budget-range"]')).toHaveText('₱420');

  await page.goto('/log');
  await settled(page, '/log');
  await expect(page.getByRole('region', { name: 'Recent' })).toContainText('Kangkong · 2 tali');
  await page.goto('/eatery');
  await settled(page, '/eatery');
  await expect(page.getByRole('link', { name: /Adobong Manok.*kg sold/ })).toBeVisible();
});

test('a file that isn’t a Kain backup is refused', async ({ page }) => {
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await page.getByLabel('Backup file to restore').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText("That file isn't a Kain backup.")).toBeVisible();
});

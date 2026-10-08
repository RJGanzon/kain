import { expect, test, type Page } from '@playwright/test';
import { ready, settled } from './helpers';
import { seedEateryDay } from './seed';

/** Phase 6: menu costing, pots, recording sales, weighing, alerts and the free limit. */

async function openEatery(page: Page) {
  await page.goto('/eatery');
  await settled(page, '/eatery');
  await ready(page);
}

test('the sample day adds up like the design', async ({ page }) => {
  await openEatery(page);
  await seedEateryDay(page);
  await settled(page, '/eatery');
  const card = page.getByRole('region', { name: 'Profit right now' });
  await expect(card).toContainText('16.4 of 24.3 kg sold');
  await expect(card).toContainText('If the rest sells');
  await expect(card).toContainText('7.9 kg');
  const sinigang = page.getByRole('link', { name: /Sinigang na Bangus/ });
  await expect(sinigang).toContainText('to break even');

  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await expect(page.getByText(/Kamatis up \d+% this month/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Adobong Manok/ })).toContainText('Cost ₱33.17 · sells ₱85 · 160 g per order');
  await expect(page.getByText('Cheaper substitutes')).toBeVisible();
});

test('a new eatery: add dishes, cook a pot, record sales, weigh the pot', async ({ page }) => {
  await openEatery(page);
  await expect(page.getByRole('heading', { name: 'Add your first dish' })).toBeVisible();
  await page.getByRole('link', { name: 'Add a dish' }).click();
  await settled(page, '/eatery?sheet=add-dish');
  await page.getByRole('radio', { name: 'Adobong Manok' }).click();
  await page.getByRole('button', { name: 'Add dish' }).click();
  await settled(page, '/eatery');

  await page.getByRole('link', { name: 'Adobong Manok' }).click();
  await settled(page, /\/eatery\?sheet=cook&dish=/);
  await page.getByRole('button', { name: '4 kg' }).click();
  await expect(page.getByText(/About 25 orders of 160 g/)).toBeVisible();
  await page.getByRole('button', { name: 'Start the pot' }).click();
  await settled(page, '/eatery');

  await page.getByRole('link', { name: /Adobong Manok.*kg sold/ }).click();
  await settled(page, /\/eatery\/pot\?id=/);
  await expect(page.getByText('0 of 25 orders sold · 25 left · 1 order ≈ 160 g')).toBeVisible();
  await expect(page.getByText('Still to break even')).toBeVisible();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+5 orders' }).click();
  await expect(page.getByText('20 of 25 orders sold · 5 left')).toBeVisible();
  await expect(page.getByText('Profit so far', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Totals' })).toContainText('₱1,700');
  await page.getByRole('button', { name: 'Undo one order' }).click();
  await expect(page.getByText('19 of 25 orders sold')).toBeVisible();

  await page.getByRole('link', { name: 'Weigh the pot instead' }).click();
  await settled(page, /sheet=weigh/);
  await page.getByLabel(/How many kilos are left/).fill('0.8');
  await expect(page.getByText("That's 20 of 25 orders sold.")).toBeVisible();
  await page.getByRole('button', { name: 'Update sold' }).click();
  await settled(page, /\/eatery\/pot\?id=[^&]+$/);
  await expect(page.getByText('20 of 25 orders sold · 5 left')).toBeVisible();
  await expect(page.getByText(/5 orders \(0\.8 kg\) left\. Selling them at ₱60 after 6 pm still brings in ₱300/)).toBeVisible();

  // Sales survive a reload (they're on the phone).
  await page.reload();
  await expect(page.getByText('20 of 25 orders sold · 5 left')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await settled(page, '/eatery');
  await expect(page.getByRole('region', { name: 'Profit right now' })).toContainText('3.2 of 4.0 kg sold');
});

test('the free plan costs 3 dishes; the 4th opens the Business plan', async ({ page }) => {
  await openEatery(page);
  await seedEateryDay(page, { business: false, dishes: 3 });
  await settled(page, '/eatery');
  await expect(page.getByRole('link', { name: 'Free · 3 of 3' })).toBeVisible();
  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await expect(page.getByText('Price spike alerts and cheaper substitutes')).toBeVisible();
  await expect(page.getByText(/up \d+% this month/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Add dish' }).click();
  await settled(page, '/business');
});

test('change a dish’s price, and remove a pot', async ({ page }) => {
  await openEatery(page);
  const pots = await seedEateryDay(page, { dishes: 2 });
  await settled(page, '/eatery');
  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await page.getByRole('link', { name: /Adobong Manok/ }).click();
  await settled(page, /sheet=edit/);
  await page.getByLabel('Sells for').fill('90');
  await page.getByRole('button', { name: 'Save' }).click();
  await settled(page, '/eatery');
  await expect(page.getByRole('link', { name: /Adobong Manok/ })).toContainText('sells ₱90');

  await page.goto(`/eatery/pot?id=${pots[0]}`);
  await settled(page, /\/eatery\/pot/);
  await page.getByRole('button', { name: 'Remove this pot' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await settled(page, '/eatery');
  await page.getByRole('radio', { name: "Today's sales" }).click();
  await expect(page.getByRole('link', { name: /Ginisang Munggo.*kg sold/ })).toHaveCount(0);
});

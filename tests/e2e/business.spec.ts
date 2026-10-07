import { expect, test } from '@playwright/test';
import { admin } from '../db/local';
import { hasBackend } from './account';
import { settled } from './helpers';
import { removeSeedUsers, seedEateryDay, seedUsers } from './seed';

/** Phase 9: the Business plan, demo activation only (no real payments). */

test.afterEach(removeSeedUsers);

test('a guest is asked to sign in before starting', async ({ page }) => {
  await page.goto('/business');
  await settled(page, '/business');
  test.skip(!(await hasBackend(page)), 'no backend in this build');
  await expect(page.getByRole('button', { name: 'Sign in to start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Demo: activate without payment' })).toHaveCount(0);
});

test('a free eatery at 3 dishes upgrades through the demo activation', async ({ page }) => {
  await page.goto('/eatery');
  await settled(page, '/eatery');
  await seedEateryDay(page, { business: false, dishes: 3 });
  await settled(page, '/eatery');
  await expect(page.getByRole('link', { name: 'Free · 3 of 3' })).toBeVisible();

  await page.getByRole('link', { name: 'Add dish' }).click();
  await settled(page, '/business');
  await page.getByRole('button', { name: 'Start Business plan' }).click();
  await expect(page.getByText("GCash payments aren't set up yet, so nothing is charged in this version.")).toBeVisible();
  await page.getByRole('button', { name: 'Demo: activate without payment' }).click();
  await settled(page, '/eatery');
  await expect(page.getByRole('link', { name: 'Business', exact: true })).toBeVisible();

  const owner = seedUsers[0];
  if (owner) {
    await expect.poll(async () => (await admin().from('profiles').select('plan').eq('id', owner.id).single()).data?.plan).toBe('business');
  }

  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await expect(page.getByText('Price spike alerts and cheaper substitutes')).toHaveCount(0);
  await page.getByRole('link', { name: 'Add dish' }).click();
  await settled(page, '/eatery?sheet=add-dish');
  await page.getByRole('radio', { name: 'Tortang Talong' }).click();
  await page.getByRole('button', { name: 'Add dish' }).click();
  await settled(page, '/eatery');
  await expect(page.getByRole('heading', { name: /Menu · 4 dishes/ })).toBeVisible();

  // Opening the plan again says it's active.
  await page.getByRole('link', { name: 'Business', exact: true }).click();
  await settled(page, '/business');
  await expect(page.getByText("You're on the Business plan.")).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { recordTransitions, settled } from './helpers';
import { removeSeedUsers, seedEateryDay } from './seed';

test.afterEach(removeSeedUsers);

/** Every screen and sheet loads and runs without a console error. */
test('no console errors on any screen', async ({ page }) => {
  const errors = await recordTransitions(page);
  const tabs = page.getByRole('navigation', { name: 'Main' });

  await page.goto('/');
  await settled(page, '/signin');
  await page.getByRole('link', { name: 'Plan meals without an account' }).click();
  await settled(page, '/plan/setup');
  await page.getByRole('button', { name: 'More kids' }).click();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await settled(page, '/plan');

  await page.getByRole('link', { name: /Change market/ }).click();
  await settled(page, '/plan?sheet=market');
  await page.getByRole('radio', { name: /San Nicolas Market/ }).click();
  await settled(page, '/plan');
  await expect(page.getByRole('link', { name: /Change market/ })).toContainText('San Nicolas Market');

  await page.getByRole('link', { name: 'See week' }).click();
  await settled(page, '/plan/week');
  const secondDay = page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio').nth(1);
  const dayName = ((await secondDay.getAttribute('aria-label')) ?? '').split(',')[0];
  await secondDay.click();
  await expect(page.getByText(`${dayName} vs FNRI needs`)).toBeVisible();
  await page.getByRole('checkbox').first().click();
  await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');

  await tabs.getByRole('link', { name: 'Eatery' }).click();
  await settled(page, '/eatery');
  await seedEateryDay(page);
  await settled(page, '/eatery');
  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await expect(page.getByText('Kamatis up 41% this month')).toBeVisible();
  await page.getByRole('radio', { name: "Today's sales" }).click();
  await page.getByRole('link', { name: /Sinigang na Bangus/ }).click();
  await settled(page, /\/eatery\/pot\?id=[^&]+$/);
  await expect(page.getByText('Still to break even')).toBeVisible();
  await page.getByRole('button', { name: '+5 orders' }).click();
  await page.getByRole('button', { name: '+1 order' }).click();
  await page.getByRole('button', { name: '+1 order' }).click();
  await expect(page.getByText('Profit so far', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Weigh the pot instead' }).click();
  await settled(page, /sheet=weigh$/);
  await page.getByLabel(/How many kilos are left/).fill('1.5');
  await page.getByRole('button', { name: 'Update sold' }).click();
  await settled(page, /\/eatery\/pot\?id=[^&]+$/);
  await expect(page.getByText('14 of 20 orders sold')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await settled(page, '/eatery');

  await page.getByRole('link', { name: 'Business', exact: true }).click();
  await settled(page, '/business');
  await expect(page.getByText("You're on the Business plan.")).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await settled(page, '/eatery');

  await tabs.getByRole('link', { name: 'Log' }).click();
  await settled(page, '/log');
  await page.getByLabel('What you bought and how much you paid').fill('isang kilo kamatis 110');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText(/Kamatis price added for .* Market./)).toBeVisible();

  await tabs.getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  await page.getByRole('radio', { name: 'Fish' }).click();
  await expect(page.getByText('Galunggong')).toBeVisible();
  await expect(page.getByText('Kamatis')).toHaveCount(0);
  await page.getByRole('radio', { name: 'All' }).click();
  await page.getByLabel('Search prices').fill('tomato');
  await expect(page.getByRole('listitem')).toHaveCount(1);

  expect(errors).toEqual([]);
});

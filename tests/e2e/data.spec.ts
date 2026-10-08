import { expect, test } from '@playwright/test';
import { settled } from './helpers';

/** Prices ship with the app (sample estimates) and show their source and date. */

test('prices show their source and date', async ({ page }) => {
  await page.goto('/prices');
  await settled(page, '/prices');
  const kamatis = page.getByRole('listitem').filter({ hasText: 'Kamatis' });
  await expect(kamatis).toContainText('₱120/kg');
  await expect(kamatis).toContainText('Estimate');
  await expect(kamatis).toContainText('▲ 41%');
  await expect(page.getByRole('listitem')).toHaveCount(36);
  await expect(page.getByText('Sample data').first()).toBeVisible();
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

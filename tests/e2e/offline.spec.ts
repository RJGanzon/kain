import { expect, test, type Page } from '@playwright/test';
import { ready, settled } from './helpers';
import { seedEateryDay } from './seed';

/** Phase 8: installable PWA; works offline after the first visit; offline writes sync later. */

async function swReady(page: Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready;
    return Boolean(reg?.active && navigator.serviceWorker.controller);
  }, null, { timeout: 30_000 });
}

test('Kain is installable', async ({ page }) => {
  await page.goto('/plan');
  await settled(page, '/plan');
  await swReady(page);
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'Kain', short_name: 'Kain', display: 'standalone', start_url: '/' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

test('the planner worker still starts once the service worker controls the page', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/plan');
  await settled(page, '/plan');
  await swReady(page);
  // Controlled from the start of this load: the worker script now comes through the service worker.
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await page.getByRole('button', { name: 'More adults' }).click();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await settled(page, '/plan');
  await ready(page);
  await expect(page.getByRole('region', { name: 'Plan cost today' })).toContainText('3 adults');
  expect(problems.filter((p) => /worker/i.test(p))).toEqual([]);
});

test('after the first visit, a guest plans, logs and checks prices offline', async ({ page, context }) => {
  await page.goto('/plan');
  await settled(page, '/plan');
  await swReady(page);
  await ready(page);
  // Visit the tabs once, as a person would.
  const tabs = page.getByRole('navigation', { name: 'Main' });
  for (const [name, path] of [['Log', '/log'], ['Prices', '/prices'], ['Plan', '/plan']] as const) {
    await tabs.getByRole('link', { name }).click();
    await settled(page, path);
  }
  await page.getByRole('link', { name: 'See week' }).click();
  await settled(page, '/plan/week');
  await page.goto('/plan');
  await settled(page, '/plan');

  await context.setOffline(true);
  await page.reload();
  await settled(page, '/plan');
  await ready(page);
  await expect(page.getByRole('region', { name: 'Plan cost today' })).toContainText('of ₱350');
  await page.getByRole('link', { name: 'See week' }).click();
  await settled(page, '/plan/week');
  await expect(page.getByText('Nutrition covered')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await settled(page, '/plan');

  await tabs.getByRole('link', { name: 'Log' }).click();
  await settled(page, '/log');
  await page.getByLabel('What you bought and how much you paid').fill('2 tali kangkong 40');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Kangkong price added for Pampang Market.')).toBeVisible();

  await tabs.getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  await expect(page.getByRole('listitem').filter({ hasText: 'Kangkong' })).toContainText('Your log');
  await context.setOffline(false);
});

test('pot sales recorded offline are kept on the phone', async ({ page, context }) => {
  await page.goto('/eatery');
  await settled(page, '/eatery');
  await swReady(page);
  const pots = await seedEateryDay(page);
  await settled(page, '/eatery');
  await page.goto(`/eatery/pot?id=${pots[1]}`);
  await settled(page, /\/eatery\/pot\?id=/);
  await expect(page.getByText('20 of 25 orders sold')).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: '+1 order' }).click();
  await page.getByRole('button', { name: '+1 order' }).click();
  await expect(page.getByText('22 of 25 orders sold')).toBeVisible();
  await page.reload();
  await expect(page.getByText('22 of 25 orders sold')).toBeVisible();
  await context.setOffline(false);
});

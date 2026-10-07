import { expect, test } from '@playwright/test';
import { ready, settled } from './helpers';

/** Phase 4: Set budget → planner (in a Web Worker) → Today's plan and Week. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __workers: string[] };
    w.__workers = [];
    const Real = window.Worker;
    window.Worker = class extends Real {
      constructor(url: string | URL, opts?: WorkerOptions) {
        super(url, opts);
        w.__workers.push(String(url));
      }
    } as typeof Worker;
  });
});

test('the default plan matches the design and is made in a Web Worker', async ({ page }) => {
  await page.goto('/plan');
  await settled(page, '/plan');
  await ready(page);
  const hero = page.getByRole('region', { name: 'Plan cost today' });
  await expect(hero).toContainText('₱291');
  await expect(hero).toContainText('of ₱350');
  await expect(hero).toContainText('₱59 left');
  await expect(hero).toContainText('2 adults · 3 kids');
  await expect(page.getByText('Sardinas na may Itlog')).toBeVisible();
  await expect(page.getByText('Adobong Atay at Patatas')).toBeVisible();
  await expect(page.getByText("Tokwa't Gulay")).toBeVisible();
  await expect(page.getByText('Day 1 of 7 · for 3.8 servings')).toBeVisible();
  const workers = await page.evaluate(() => (window as unknown as { __workers: string[] }).__workers);
  expect(workers.some((u) => /planner/.test(u) || /\.js/.test(u))).toBe(true);
});

test('changing the budget and family builds a new plan, the same every time', async ({ page }) => {
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await page.getByRole('button', { name: '₱500' }).click();
  await page.getByRole('button', { name: 'More adults' }).click();
  await page.getByRole('button', { name: 'Fewer kids' }).click();
  await expect(page.getByText('4.2 servings per meal')).toBeVisible();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await settled(page, '/plan');
  await ready(page);
  const hero = page.getByRole('region', { name: 'Plan cost today' });
  await expect(hero).toContainText('of ₱500');
  await expect(hero).toContainText('3 adults · 2 kids');
  const meals = await page.getByRole('region', { name: 'Meals' }).innerText().catch(() => page.locator('#meals-title').locator('..').locator('..').innerText());

  // Same inputs, same plan: reload and compare.
  await page.reload();
  await settled(page, '/plan');
  await ready(page);
  const again = await page.getByRole('region', { name: 'Meals' }).innerText().catch(() => page.locator('#meals-title').locator('..').locator('..').innerText());
  expect(again).toEqual(meals);

  // The week stays within budget.
  await page.getByRole('link', { name: 'See week' }).click();
  await settled(page, '/plan/week');
  await ready(page);
  await expect(page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio')).toHaveCount(7);
  const total = await page.locator('#shop-title').locator('..').innerText();
  const peso = Number(total.match(/All \d+ · ₱([\d,]+)/)![1].replace(/,/g, ''));
  expect(peso).toBeLessThanOrEqual(3500);
});

test('a budget that is too small says so and shows the cheapest plan', async ({ page }) => {
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  const slider = page.getByRole('slider');
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'More adults' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'More kids' }).click();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await settled(page, '/plan');
  await ready(page);
  await expect(page.getByText(/Budget too small\. The cheapest plan costs ₱[\d,]+ a day\./)).toBeVisible();
});

test('plan for today only', async ({ page }) => {
  await page.goto('/plan/setup');
  await settled(page, '/plan/setup');
  await page.getByRole('radio', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await settled(page, '/plan');
  await ready(page);
  await expect(page.getByText('Today · for 3.8 servings')).toBeVisible();
  await expect(page.getByText(/items for today/)).toBeVisible();
});

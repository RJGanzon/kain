import { expect, test } from '@playwright/test';
import { recordTransitions, screenTitle, settled, transitions } from './helpers';
import { seedEateryDay } from './seed';

test.describe('screen transitions', () => {
  test('push slides Week in, browser Back pops it, Today keeps its scroll', async ({ page }) => {
    const errors = await recordTransitions(page);
    // A short phone, so Today has room to scroll.
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/plan');
    await settled(page, '/plan');

    const todayScroll = page.locator('section[data-screen="tab"] [data-scroll]');
    await todayScroll.evaluate((el) => (el.scrollTop = 150));

    // Dispatch the tap: Playwright's click() would scroll the link into view first.
    await page.getByRole('link', { name: 'See week' }).dispatchEvent('click');
    await settled(page, '/plan/week');
    await expect(screenTitle(page)).toHaveText('This week');
    await expect(page.locator('section[data-screen="tab"]')).toHaveAttribute('data-covered', '');

    await page.goBack();
    await settled(page, '/plan');
    await expect(page.locator('section[data-screen="tab"]')).not.toHaveAttribute('data-covered', '');
    expect(await todayScroll.evaluate((el) => el.scrollTop)).toBe(150);

    expect(await transitions(page)).toEqual(['push', 'pop']);
    expect(errors).toEqual([]);
  });

  test('the in-app Back button uses history when there is some', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/plan');
    await settled(page, '/plan');
    await page.getByRole('link', { name: 'Edit budget' }).click();
    await settled(page, '/plan/setup');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await settled(page, '/plan');
    expect(await transitions(page)).toEqual(['push-full', 'pop-full']);
    // Forward re-plays the push.
    await page.goForward();
    await settled(page, '/plan/setup');
    expect((await transitions(page)).at(-1)).toBe('push-full');
  });

  test('a deep link Back falls back to the parent screen', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/plan/week');
    await settled(page, '/plan/week');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await settled(page, '/plan');
    expect(await transitions(page)).toEqual(['pop']);
  });

  test('tabs fade through; Back from any tab returns to Plan once', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/plan');
    await settled(page, '/plan');
    const tabs = page.getByRole('navigation', { name: 'Main' });

    await tabs.getByRole('link', { name: 'Eatery' }).click();
    await settled(page, '/eatery');
    await tabs.getByRole('link', { name: 'Log' }).click();
    await settled(page, '/log');
    await tabs.getByRole('link', { name: 'Prices' }).click();
    await settled(page, '/prices');
    await expect(tabs.getByRole('link', { name: 'Prices' })).toHaveAttribute('aria-current', 'page');

    await page.goBack();
    await settled(page, '/plan');
    expect(await transitions(page)).toEqual(['tab', 'tab', 'tab', 'tab']);

    // Tapping Plan from another tab jumps back to the existing Plan entry.
    await tabs.getByRole('link', { name: 'Log' }).click();
    await settled(page, '/log');
    await tabs.getByRole('link', { name: 'Plan' }).click();
    await settled(page, '/plan');
    expect((await transitions(page)).slice(-2)).toEqual(['tab', 'tab']);
  });

  test('tapping the current tab pops back to its root', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/eatery');
    await settled(page, '/eatery');
    await seedEateryDay(page);
    await settled(page, '/eatery');
    await page.evaluate(() => ((window as unknown as { __vt: string[] }).__vt.length = 0));
    await page.getByRole('link', { name: /Adobong Manok/ }).click();
    await settled(page, /\/eatery\/pot\?id=/);
    // The pot screen covers the tab bar.
    const bar = await page.locator('.tabbar').boundingBox();
    await expect
      .poll(() =>
        page.evaluate(
          ([x, y]) => document.elementFromPoint(x, y)?.closest('section')?.getAttribute('data-screen'),
          [bar!.x + bar!.width / 2, bar!.y + bar!.height / 2],
        ),
      )
      .toBe('stack-full');
    await page.goBack();
    await settled(page, '/eatery');
    expect(await transitions(page)).toEqual(['push-full', 'pop-full']);
  });

  test('Business plan slides up as a sheet and back down', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/eatery');
    await settled(page, '/eatery');
    await page.getByRole('link', { name: /^(Business|Free · \d of 3)$/ }).click();
    await settled(page, '/business');
    await page.getByRole('button', { name: 'Close' }).click();
    await settled(page, '/eatery');
    expect(await transitions(page)).toEqual(['sheet-up', 'sheet-down']);
  });

  test('the welcome screen hands over to the app without leaving itself in history', async ({ page }) => {
    await recordTransitions(page);
    await page.goto('/welcome');
    await settled(page, '/welcome');
    await page.getByRole('button', { name: /For my family/ }).click();
    await settled(page, '/plan/setup');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await settled(page, '/plan');
    expect(await transitions(page)).toEqual(['push-full', 'pop-full']);
  });

  test('edge swipe-back drags the screen away and goes back', async ({ page }) => {
    await recordTransitions(page);
    await page.addInitScript(() => localStorage.setItem('kain:swipeback', '1'));
    await page.goto('/plan');
    await settled(page, '/plan');
    await page.getByRole('link', { name: 'See week' }).click();
    await settled(page, '/plan/week');

    await page.mouse.move(6, 400);
    await page.mouse.down();
    for (let x = 20; x <= 260; x += 20) await page.mouse.move(x, 402);
    await page.mouse.up();
    await settled(page, '/plan');
    // The swipe itself was the animation: no extra view transition on the way back.
    expect(await transitions(page)).toEqual(['push']);
    await expect(page.locator('section[data-screen="tab"]')).toHaveAttribute('style', /^$|transform: none|^(?!.*translate)/);
  });

  test('a short swipe springs back', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kain:swipeback', '1'));
    await page.goto('/plan/week');
    await settled(page, '/plan/week');
    await page.mouse.move(6, 400);
    await page.mouse.down();
    for (let x = 16; x <= 70; x += 6) await page.mouse.move(x, 401, { steps: 2 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/plan\/week$/);
    expect(await page.locator('section[data-screen="stack"]').evaluate((el) => el.style.transform)).toBe('');
  });
});

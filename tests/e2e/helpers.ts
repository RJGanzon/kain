import { expect, type Page } from '@playwright/test';

/** Record every view transition's kind (the <html data-nav> tag) and any console errors. */
export async function recordTransitions(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 500) errors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: string[] };
    w.__vt = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      w.__vt.push(document.documentElement.dataset.nav ?? '(none)');
      return start(arg);
    }) as typeof document.startViewTransition;
  });
  return errors;
}

export async function transitions(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __vt: string[] }).__vt.slice());
}

/** Wait until no screen transition is running and the URL is `path`. */
export async function settled(page: Page, path: string | RegExp): Promise<void> {
  await expect(page).toHaveURL(typeof path === 'string' ? new RegExp(`${escape(path)}$`) : path);
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
}

/** Wait until nothing on screen is still being worked out (plans, prices). */
export async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => !document.querySelector('section[data-screen]:not([data-covered]) [aria-busy="true"]'));
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Visible (uncovered) screen's heading. */
export function screenTitle(page: Page) {
  return page.locator('section[data-screen]:not([data-covered]) h1').last();
}

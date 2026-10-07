import { expect, test, type Page } from '@playwright/test';
import { settled } from './helpers';

/**
 * Transition smoothness on a slow phone: CPU throttled 6×. For each
 * transition we measure how long a tap takes to start the animation and
 * the longest main-thread frame while it runs.
 *
 * Timing depends on whatever else the computer is doing, so this runs on
 * demand, on a quiet machine: PERF=1 npx playwright test --project perf
 */
test.skip(!process.env.PERF, 'set PERF=1 to measure transition timing');

interface Sample {
  kind: string;
  startLatency: number;
  worstFrame: number;
  longTasks: number;
}

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __perf: Sample[]; __tap: number };
    w.__perf = [];
    w.__tap = 0;
    addEventListener('pointerdown', () => (w.__tap = performance.now()), { capture: true });
    addEventListener('click', () => (w.__tap ||= performance.now()), { capture: true });
    const longTasks: number[] = [];
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((e) => longTasks.push(e.startTime))).observe({ type: 'longtask', buffered: false });
    } catch {
      /* not supported */
    }
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const kind = document.documentElement.dataset.nav ?? '';
      const tap = w.__tap || performance.now();
      w.__tap = 0;
      const vt = start(arg);
      void vt.ready.then(() => {
        const t0 = performance.now();
        let last = t0;
        let worst = 0;
        let running = true;
        const frame = (t: number) => {
          worst = Math.max(worst, t - last);
          last = t;
          if (running) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        void vt.finished.finally(() => {
          running = false;
          w.__perf.push({
            kind,
            startLatency: Math.round(t0 - tap),
            worstFrame: Math.round(worst),
            longTasks: longTasks.filter((s) => s >= t0).length,
          });
        });
      });
      return vt;
    }) as typeof document.startViewTransition;
  });
}

test('transitions stay smooth with the CPU slowed 6×', async ({ page }) => {
  test.setTimeout(120_000);
  await instrument(page);
  await page.goto('/plan');
  await settled(page, '/plan');
  // A person looks at the first screen before tapping; the app warms up the others meanwhile.
  await page.waitForTimeout(2500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const tabs = page.getByRole('navigation', { name: 'Main' });

  await page.getByRole('link', { name: 'See week' }).click();
  await settled(page, '/plan/week');
  await page.getByRole('button', { name: 'Back' }).click();
  await settled(page, '/plan');
  await tabs.getByRole('link', { name: 'Eatery' }).click();
  await settled(page, '/eatery');
  await page.getByRole('link', { name: 'Adobong Manok' }).click();
  await settled(page, '/eatery/pot/adobong-manok');
  await page.goBack();
  await settled(page, '/eatery');
  await page.getByRole('radio', { name: 'Menu costs' }).click();
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
  await tabs.getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  await page.waitForTimeout(300);

  const samples = await page.evaluate(() => (window as unknown as { __perf: Sample[] }).__perf);
  console.table(samples);
  expect(samples.map((s) => s.kind)).toEqual(['push', 'pop', 'tab', 'push-full', 'pop-full', 'seg-next', 'tab']);
  // A tap usually starts moving within a quarter second even on a slow phone; a busy
  // machine can make one tap slower, but never more than one, and never past a second.
  const starts = samples.map((s) => s.startLatency).sort((a, b) => a - b);
  expect(starts[Math.floor(starts.length / 2)], 'median start').toBeLessThan(250);
  expect(starts.filter((v) => v >= 300).length, 'slow starts').toBeLessThanOrEqual(1);
  expect(starts.at(-1), 'slowest start').toBeLessThan(1000);
  // The main thread never stalls long enough to show (the compositor runs the animation).
  for (const s of samples) expect(s.worstFrame, `${s.kind} frame`).toBeLessThan(100);
});

import { test, type Page } from '@playwright/test';
import { settled } from './helpers';

/**
 * Captures each screen transition frozen part-way, for eyeballing the motion.
 * Not part of the normal run: FRAMES=1 npx playwright test frames
 * Output: test-results/frames/*.png
 */
test.skip(!process.env.FRAMES, 'set FRAMES=1 to capture transition frames');

const AT = Number(process.env.FRAMES_AT ?? 0.45);

async function freezeTransitions(page: Page) {
  await page.addInitScript((at: number) => {
    const w = window as unknown as { __frozen: boolean; __release: () => void };
    w.__frozen = false;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const vt = start(arg);
      void vt.ready.then(() => {
        const anims = document.getAnimations().filter((a) => {
          const t = a.effect as KeyframeEffect | null;
          return t?.pseudoElement?.startsWith('::view-transition');
        });
        const end = Math.max(
          ...anims.map((a) => {
            const timing = a.effect!.getComputedTiming();
            return Number(timing.endTime ?? 0);
          }),
        );
        for (const a of anims) {
          a.pause();
          a.currentTime = end * at;
        }
        w.__frozen = true;
        w.__release = () => {
          for (const a of anims) a.play();
          w.__frozen = false;
        };
      });
      return vt;
    }) as typeof document.startViewTransition;
  }, AT);
}

async function capture(page: Page, name: string, act: () => Promise<unknown>) {
  await act();
  await page.waitForFunction(() => (window as unknown as { __frozen: boolean }).__frozen);
  await page.screenshot({ path: `test-results/frames/${name}.png` });
  await page.evaluate(() => (window as unknown as { __release: () => void }).__release());
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
}

test('capture transition frames', async ({ page }) => {
  await freezeTransitions(page);
  await page.goto('/plan');
  await settled(page, '/plan');
  const tabs = page.getByRole('navigation', { name: 'Main' });

  await capture(page, '1-push-week', () => page.getByRole('link', { name: 'See week' }).click());
  await capture(page, '2-pop-week', () => page.goBack());
  await capture(page, '3-push-full-setup', () => page.getByRole('link', { name: 'Edit budget' }).click());
  await capture(page, '4-pop-full-setup', () => page.getByRole('button', { name: 'Back' }).click());
  await capture(page, '5-tab-eatery', () => tabs.getByRole('link', { name: 'Eatery' }).click());
  await capture(page, '6-sheet-up-business', () => page.getByRole('link', { name: 'Business plan' }).click());
  await capture(page, '7-sheet-down-business', () => page.getByRole('button', { name: 'Back' }).click());
  await capture(page, '8-push-full-pot', () => page.getByRole('link', { name: 'Pinakbet' }).click());
});

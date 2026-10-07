import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ready, settled } from './helpers';

/**
 * Each screen at 390×844 against its design render (tests/visual/ref, made
 * by scripts/render-designs.mjs). Writes design | app | diff images to
 * test-results/visual/ for review. Differences are expected where the app
 * shows live sample data, lucide icons and the "Sample data" label, so the
 * check is a loose ceiling that catches broken layouts.
 */

const SCREENS: Array<{ name: string; path: string; act?: (page: Page) => Promise<void> }> = [
  { name: 'SignIn', path: '/signin' },
  {
    name: 'SignIn-role',
    path: '/signin',
    act: async (page) => {
      await page.getByRole('button', { name: 'Continue with Google' }).click();
      await page.getByRole('heading', { name: 'How will you use Kain?' }).waitFor();
    },
  },
  { name: 'Setup', path: '/plan/setup' },
  { name: 'Main', path: '/plan' },
  { name: 'Week', path: '/plan/week' },
  { name: 'Log', path: '/log' },
  { name: 'Eatery', path: '/eatery' },
  { name: 'Eatery-menu', path: '/eatery', act: (page) => page.getByRole('radio', { name: 'Menu costs' }).click() },
  { name: 'Pot', path: '/eatery/pot/adobong-manok' },
  { name: 'Business', path: '/business' },
  { name: 'Prices', path: '/prices' },
];

const MAX_MISMATCH = 0.12;

test.use({ reducedMotion: 'reduce' });

async function open(page: Page, url: string, act?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await settled(page, url);
  await page.evaluate(() => document.fonts.ready);
  await ready(page);
  if (act) {
    await act(page);
    await page.waitForFunction(() => !document.documentElement.dataset.nav);
  }
  await page.waitForTimeout(200);
}

function composite(ref: PNG, app: PNG, diff: PNG): PNG {
  const gap = 10;
  const out = new PNG({ width: ref.width * 3 + gap * 2, height: ref.height });
  out.data.fill(200);
  [ref, app, diff].forEach((img, i) => PNG.bitblt(img, out, 0, 0, img.width, img.height, i * (ref.width + gap), 0));
  return out;
}

test.describe('screens match the designs at 390×844', () => {
  for (const s of SCREENS) {
    test(s.name, async ({ page }) => {
      await open(page, s.path, s.act);
      const app = PNG.sync.read(await page.screenshot());
      const ref = PNG.sync.read(fs.readFileSync(path.join('tests/visual/ref', `${s.name}.png`)));
      const diff = new PNG({ width: ref.width, height: ref.height });
      const bad = pixelmatch(ref.data, app.data, diff.data, ref.width, ref.height, { threshold: 0.15 });
      const ratio = bad / (ref.width * ref.height);
      fs.mkdirSync('test-results/visual', { recursive: true });
      fs.writeFileSync(`test-results/visual/${s.name}.png`, PNG.sync.write(composite(ref, app, diff)));
      test.info().annotations.push({ type: 'mismatch', description: `${(ratio * 100).toFixed(1)}%` });
      console.log(`${s.name.padEnd(12)} mismatch ${(ratio * 100).toFixed(1)}%`);
      expect(ratio).toBeLessThan(MAX_MISMATCH);
    });
  }
});

test.describe('360 px wide phones', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  for (const s of SCREENS) {
    test(`${s.name} has no horizontal scroll`, async ({ page }) => {
      await open(page, s.path, s.act);
      const overflow = await page.evaluate(() => {
        const out: string[] = [];
        if (document.documentElement.scrollWidth > window.innerWidth) out.push('document');
        document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.closest('section')?.getAttribute('aria-label')}: ${el.scrollWidth} > ${el.clientWidth}`);
        });
        return out;
      });
      expect(overflow).toEqual([]);
    });
  }
});

test.describe('touch targets', () => {
  for (const s of SCREENS) {
    test(`${s.name}: every control is at least 44×44`, async ({ page }) => {
      await open(page, s.path, s.act);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const sel = 'button, a[href], input, select, [role="radio"], [role="checkbox"]';
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          if (el.closest('[inert]')) return;
          // Text links inside a sentence are exempt (WCAG 2.5.8).
          if (el.tagName === 'A' && el.closest('p')) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const grown = el.classList.contains('hit');
          const w = grown ? Math.max(r.width, 44) : r.width;
          const h = grown ? Math.max(r.height, 44) : r.height;
          if (w < 43.5 || h < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        });
        return out;
      });
      expect(small).toEqual([]);
    });
  }
});

import { expect, test, type Page } from '@playwright/test';
import { ready, settled } from './helpers';

/** Phase 5: log a purchase by typing or voice; prices feed back into the market price. */

async function openLog(page: Page) {
  await page.goto('/log');
  await settled(page, '/log');
  await ready(page);
}

const input = (page: Page) => page.getByLabel('What you bought and how much you paid');

test('a close price is added and becomes your price for that market', async ({ page }) => {
  await openLog(page);
  await input(page).fill('isang kilo kamatis 110');
  await expect(page.getByText('Kamatis · 1 kg')).toBeVisible();
  await expect(page.getByText('₱110 per kg · market price ₱120')).toBeVisible();
  await expect(page.getByText(/Close to market price\. It will update Pampang's kamatis price\./)).toBeVisible();
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Kamatis price added for Pampang Market.')).toBeVisible();
  const recent = page.getByRole('region', { name: 'Recent' });
  await expect(recent).toContainText('Kamatis · 1 kg');
  await expect(recent).toContainText('Price added');
  await expect(page.getByRole('region', { name: 'This week' })).toContainText('₱110');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  const kamatis = page.getByRole('listitem').filter({ hasText: 'Kamatis' });
  await expect(kamatis).toContainText('₱110/kg');
  await expect(kamatis).toContainText('Your log');
  await expect(kamatis).toContainText('Today');
});

test('an unusual price is kept but never used', async ({ page }) => {
  await openLog(page);
  await input(page).fill('isang kilo sibuyas 400');
  await expect(page.getByText('Far from market price. It will be saved but not used.')).toBeVisible();
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText("Sibuyas saved. The price looks unusual, so it won't be used.")).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent' })).toContainText('Unusual, not used');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Prices' }).click();
  await settled(page, '/prices');
  const sibuyas = page.getByRole('listitem').filter({ hasText: 'Sibuyas' });
  await expect(sibuyas).toContainText('₱160/kg');
  await expect(sibuyas).not.toContainText('Your log');
});

test('clear messages for a missing item, price or wrong unit', async ({ page }) => {
  await openLog(page);
  await input(page).fill('isang kilo 110');
  await expect(page.getByText('Add the item name, like "kamatis" or "itlog".')).toBeVisible();
  await input(page).fill('1 kilo itlog 100');
  await expect(page.getByText('Itlog is priced per pc. Try "1 pc itlog 100".')).toBeVisible();
  await input(page).fill('isang kilo kamatis');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText(/Add the amount you paid/)).toHaveClass(/text-bad/);
  await expect(page.getByRole('region', { name: 'Recent' })).toContainText('Nothing logged yet');
});

test('voice fills in what was said', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = '';
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      start() {
        (window as unknown as { __lang: string }).__lang = this.lang;
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: 'dalawang tali kangkong 40' }]] });
          this.onend?.();
        }, 100);
      }
      stop() {}
      abort() {}
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition;
  });
  await openLog(page);
  await page.getByRole('button', { name: 'Speak your purchase' }).click();
  await expect(input(page)).toHaveValue('dalawang tali kangkong 40');
  await expect(page.getByText('Kangkong · 2 tali')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __lang: string }).__lang)).toBe('fil-PH');
});

test('without speech recognition the mic hides and typing still works', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });
  });
  await openLog(page);
  await expect(page.getByText('Voice works in Chrome on Android. Typing works everywhere.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speak your purchase' })).toHaveCount(0);
});

test('logs stay on the phone', async ({ page }) => {
  await openLog(page);
  await page.getByRole('button', { name: 'isang dosenang itlog 102' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Itlog price added for Pampang Market.')).toBeVisible();
  await page.reload();
  await settled(page, '/log');
  await expect(page.getByRole('region', { name: 'Recent' })).toContainText('Itlog · 12 pcs');
  const queued = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('kain');
        open.onsuccess = () => {
          const req = open.result.transaction('outbox').objectStore('outbox').count();
          req.onsuccess = () => resolve(req.result);
        };
      }),
  );
  // Nothing waits to upload: this build keeps everything on the phone.
  expect(queued).toBe(0);
});

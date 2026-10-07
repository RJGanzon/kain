import { expect, test, type Page } from '@playwright/test';
import { admin } from '../db/local';
import { hasBackend as backend, makeUser, signInAs } from './account';
import { ready, settled } from './helpers';

/**
 * Phase 7: sign in, role picker, guest → account. Real Google/Facebook
 * logins need the OAuth apps, so these tests sign in with a session minted
 * for a local test user, exactly as Supabase would store it.
 */

test('the sign-in buttons use the official logos and explain a provider that is off', async ({ page }) => {
  await page.goto('/signin');
  await settled(page, '/signin');
  const google = page.getByRole('button', { name: 'Continue with Google' });
  const facebook = page.getByRole('button', { name: 'Continue with Facebook' });
  await expect(google.locator('img')).toHaveAttribute('src', /google-g/);
  await expect(facebook.locator('img')).toHaveAttribute('src', /facebook-logo/);
  test.skip(!(await backend(page)), 'no backend in this build');
  await google.click();
  await expect(page.getByText(/Google sign-in isn't switched on for Kain yet/)).toBeVisible();
  await expect(google).toBeVisible();
});

test('a cancelled sign-in says so', async ({ page }) => {
  await page.goto('/auth/callback?error=access_denied&error_description=access_denied');
  await expect(page.getByText('Sign-in was cancelled.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await settled(page, '/signin');
});

test('the eatery asks a guest to sign in', async ({ page }) => {
  await page.goto('/eatery');
  await settled(page, '/eatery');
  test.skip(!(await backend(page)), 'no backend in this build');
  await expect(page.getByRole('heading', { name: 'Sign in to run your eatery' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add dish' })).toHaveCount(0);
});

test('signing in: pick a role, and the guest’s data moves into the account', async ({ page }) => {
  await page.goto('/log');
  await settled(page, '/log');
  test.skip(!(await backend(page)), 'no backend in this build');
  await ready(page);
  // As a guest: set the family and log a purchase.
  await page.getByLabel('What you bought and how much you paid').fill('isang kilo sayote 50');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Sayote price added for Pampang Market.')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kain:family', JSON.stringify({ budget: 420, adults: 3, kids: 1, days: 7 })));

  const u = await makeUser();
  try {
    await signInAs(page, u);
    await page.goto('/signin');
    await expect(page.getByText('Signed in with Google')).toBeVisible();
    await page.getByRole('button', { name: /For my eatery/ }).click();
    await settled(page, '/eatery');
    await expect(page.getByRole('heading', { name: 'Add your first dish' })).toBeVisible();

    const svc = admin();
    await expect.poll(async () => (await svc.from('profiles').select('role').eq('id', u.id).single()).data?.role, { timeout: 15_000 }).toBe('eatery');
    await expect
      .poll(async () => (await svc.from('purchase_logs').select('total_price, status').eq('user_id', u.id)).data, { timeout: 15_000 })
      .toEqual([{ total_price: 50, status: 'accepted' }]);
    await expect
      .poll(async () => (await svc.from('family_settings').select('budget_per_day, adults, kids').eq('user_id', u.id).maybeSingle()).data, { timeout: 15_000 })
      .toEqual({ budget_per_day: 420, adults: 3, kids: 1 });

    // A dish added while signed in reaches the account too.
    await page.getByRole('link', { name: 'Add a dish' }).click();
    await page.getByRole('radio', { name: 'Tinolang Manok' }).click();
    await page.getByRole('button', { name: 'Add dish' }).click();
    await settled(page, '/eatery');
    await expect.poll(async () => (await svc.from('eatery_menu').select('recipe_id').eq('user_id', u.id)).data, { timeout: 15_000 }).toEqual([{ recipe_id: 'tinola' }]);

    // Sign out: the account's data leaves the phone.
    await page.goto('/plan/setup');
    await settled(page, '/plan/setup');
    await expect(page.getByRole('heading', { name: 'Aling Nena' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await settled(page, '/signin');
    await page.goto('/eatery');
    await expect(page.getByRole('heading', { name: 'Sign in to run your eatery' })).toBeVisible();
  } finally {
    await admin().from('prices').delete().eq('reported_by', u.id);
    await admin().auth.admin.deleteUser(u.id);
  }
});

test('a returning account brings its menu onto a new phone', async ({ page }) => {
  await page.goto('/eatery');
  await settled(page, '/eatery');
  test.skip(!(await backend(page)), 'no backend in this build');
  const u = await makeUser();
  try {
    const svc = admin();
    await svc.from('profiles').update({ role: 'eatery' }).eq('id', u.id);
    await svc.from('eatery_menu').insert({ user_id: u.id, recipe_id: 'amanok', price: 85, order_g: 160 });
    await signInAs(page, u);
    await page.reload();
    await settled(page, '/eatery');
    await page.getByRole('radio', { name: 'Menu costs' }).click();
    await expect(page.getByRole('link', { name: /Adobong Manok/ })).toContainText('Cost ₱33.17 · sells ₱85');
  } finally {
    await admin().auth.admin.deleteUser(u.id);
  }
});

import type { Page } from '@playwright/test';
import { admin, LOCAL_URL, mintToken } from '../db/local';

/**
 * Test accounts for the browser tests. Real Google/Facebook logins need the
 * OAuth apps, so a session is minted for a local test user and stored the
 * way Supabase stores it.
 */

export const STORAGE_KEY = `sb-${new URL(LOCAL_URL).hostname.split('.')[0]}-auth-token`;

export async function hasBackend(page: Page): Promise<boolean> {
  return page.evaluate(() => Boolean(document.querySelector('meta[name="kain-backend"]')));
}

export async function makeUser(name = 'Aling Nena') {
  const email = `e2e-${crypto.randomUUID().slice(0, 8)}@test.kain`;
  const { data, error } = await admin().auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw error;
  return { id: data.user.id, email, user: data.user };
}

export type TestUser = Awaited<ReturnType<typeof makeUser>>;

/** Store a signed-in session on the page's origin (takes effect on the next load). */
export async function signInAs(page: Page, u: TestUser): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: mintToken(u.id, u.email),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e',
    user: { ...u.user, app_metadata: { provider: 'google', providers: ['google'] } },
  };
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(session)] as const);
}

export async function removeUser(u: TestUser | null): Promise<void> {
  if (!u) return;
  const svc = admin();
  await svc.from('prices').delete().eq('reported_by', u.id);
  await svc.auth.admin.deleteUser(u.id);
}

/**
 * Sign the page in as an eatery owner (Business plan unless told otherwise),
 * when this build has a backend. Returns the user to remove afterwards.
 */
export async function asEateryOwner(page: Page, { business = true } = {}): Promise<TestUser | null> {
  if (!(await hasBackend(page))) return null;
  const u = await makeUser();
  await admin().from('profiles').update({ role: 'eatery', plan: business ? 'business' : 'free' }).eq('id', u.id);
  await signInAs(page, u);
  return u;
}

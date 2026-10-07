'use client';

import { db, type MenuItem, type Pot, type PotSale, type PurchaseLog } from '@/lib/data/db';
import { enqueue, flush } from '@/lib/data/outbox';
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_FAMILY, type FamilySettings } from '@/lib/store/device';
import { currentSession } from './session';

/**
 * Moving between the phone and the account (KAIN_BUILD_PROMPT §8):
 * at sign-in, a returning account's data comes down to the phone; a new
 * account takes the phone's guest data. Guest purchase logs are already
 * waiting in the outbox, so they go up on their own.
 */

export type Role = 'family' | 'eatery';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: Role | null;
  plan: 'free' | 'business';
  marketId: string;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('kain:device-state', { detail: key }));
  } catch {
    /* storage blocked */
  }
}

/** Fetch the profile and bring the account's data onto this phone. */
export async function syncAccount(): Promise<Profile | null> {
  const sb = supabase();
  const session = currentSession();
  if (!sb || !session) return null;
  const userId = session.user.id;

  const [profile, family, menu, pots, logs] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('family_settings').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('eatery_menu').select('*').order('position'),
    sb.from('pots').select('*').gte('date', new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)),
    sb.from('purchase_logs').select('*').gte('logged_at', new Date(Date.now() - 30 * 86_400_000).toISOString()).order('logged_at', { ascending: false }),
  ]);
  if (profile.error) throw profile.error;
  const p = profile.data;

  // Family settings: the account's if it has them, otherwise the phone's go up.
  if (family.data) {
    const f = family.data;
    writeJSON('kain:family', { budget: f.budget_per_day, adults: f.adults, kids: f.kids, days: f.days === 1 ? 1 : 7 } satisfies FamilySettings);
  } else {
    const local = readJSON<FamilySettings>('kain:family', DEFAULT_FAMILY);
    await enqueue('family', userId, local);
  }

  // Market: the phone's choice wins for a brand-new profile.
  const deviceMarket = readJSON<string | null>('kain:market', null);
  if (p && !p.role && deviceMarket && deviceMarket !== p.market_id) await enqueue('profile', userId, { market_id: deviceMarket });
  else if (p) writeJSON('kain:market', p.market_id);

  writeJSON('kain:plan', p?.plan ?? 'free');
  if (p?.role) writeJSON('kain:role', p.role);

  const d = db();
  if (d) {
    const potIds = (pots.data ?? []).map((x) => x.id);
    const sales = potIds.length ? await sb.from('pot_sales').select('*').in('pot_id', potIds) : { data: [] };
    await d.transaction('rw', [d.menu, d.pots, d.sales, d.logs], async () => {
      await d.menu.bulkPut(
        (menu.data ?? []).map(
          (m): MenuItem => ({
            id: m.id,
            recipeId: m.recipe_id,
            price: Number(m.price),
            orderG: Number(m.order_g),
            latePrice: m.late_price === null ? null : Number(m.late_price),
            extras: Number(m.extras),
            position: m.position,
            createdAt: Date.parse(m.created_at),
          }),
        ),
      );
      await d.pots.bulkPut(
        (pots.data ?? []).map((x): Pot => ({ id: x.id, menuItemId: x.menu_item_id, date: x.date, cookedKg: Number(x.cooked_kg), cookedAt: Date.parse(x.cooked_at) })),
      );
      await d.sales.bulkPut((sales.data ?? []).map((s): PotSale => ({ id: s.id, potId: s.pot_id, orders: s.orders, createdAt: Date.parse(s.created_at) })));
      const known = new Set(await d.logs.toCollection().primaryKeys());
      await d.logs.bulkPut(
        (logs.data ?? [])
          .filter((l) => !known.has(l.id))
          .map(
            (l): PurchaseLog => ({
              id: l.id,
              ingredientId: l.ingredient_id,
              qty: Number(l.qty),
              totalPrice: Number(l.total_price),
              unitPrice: Number(l.unit_price),
              refPrice: null,
              marketId: l.market_id,
              loggedAt: Date.parse(l.logged_at),
              status: l.status,
              text: '',
            }),
          ),
      );
    });
  }

  syncedFor = userId;
  void flush();
  const meta = session.user.user_metadata as { full_name?: string; name?: string };
  return {
    id: userId,
    name: p?.display_name ?? meta.full_name ?? meta.name ?? null,
    email: session.user.email ?? null,
    role: (p?.role as Role | null) ?? null,
    plan: p?.plan ?? 'free',
    marketId: p?.market_id ?? 'pampang',
  };
}

let syncedFor: string | null = null;

/** Bring the account onto the phone once per app start (and after each sign-in). */
export function ensureAccountSynced(): void {
  const id = currentSession()?.user.id ?? null;
  if (!id || syncedFor === id) return;
  syncedFor = id;
  syncAccount().catch(() => {
    syncedFor = null; // try again next time
  });
}

/** Save "For my family" / "For my eatery" (changeable later in Settings). */
export async function saveRole(role: Role): Promise<void> {
  const session = currentSession();
  writeJSON('kain:role', role);
  if (!session) return;
  const market = readJSON<string>('kain:market', 'pampang');
  await enqueue('profile', session.user.id, { role, market_id: market });
}

/**
 * Sign out and take the account's data off this phone (it stays in the
 * account). Unsynced changes are sent first when possible.
 */
export async function signOut(): Promise<{ ok: boolean; pending: number }> {
  const sb = supabase();
  const d = db();
  if (d && navigator.onLine) await flush();
  const pending = (await d?.outbox.count()) ?? 0;
  if (pending > 0 && navigator.onLine) return { ok: false, pending };
  await sb?.auth.signOut();
  if (d) await d.transaction('rw', [d.menu, d.pots, d.sales, d.logs, d.outbox], () => Promise.all([d.menu.clear(), d.pots.clear(), d.sales.clear(), d.logs.clear(), d.outbox.clear()]));
  for (const key of ['kain:plan', 'kain:role', 'kain:shop-ticked']) {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('kain:device-state', { detail: key }));
    } catch {
      /* storage blocked */
    }
  }
  return { ok: true, pending: 0 };
}

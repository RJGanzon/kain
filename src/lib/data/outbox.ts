'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { currentSession, onSessionChange, sessionReady } from '@/lib/auth/session';
import { supabase, type Kain } from '@/lib/supabase/client';
import { db, type MenuItem, type OutboxItem, type OutboxKind, type Pot, type PotSale, type PurchaseLog } from './db';

/**
 * Writes for the server wait here, on the phone, until it's online and
 * signed in (KAIN_BUILD_PROMPT §9). Everything works offline; this only
 * moves it to the account. Guests' writes wait too, so signing in later
 * moves their device data into the account.
 */

/** A later write to the same row replaces a queued one (settings, profile, menu). */
const REPLACEABLE: OutboxKind[] = ['family', 'profile', 'menu', 'pot'];

export async function enqueue(kind: OutboxKind, key: string, payload: unknown): Promise<void> {
  const d = db();
  if (!d) return;
  await d.transaction('rw', d.outbox, async () => {
    if (REPLACEABLE.includes(kind)) await d.outbox.where('key').equals(`${kind}:${key}`).delete();
    await d.outbox.add({ kind, key: `${kind}:${key}`, payload, createdAt: Date.now(), tries: 0 });
  });
  void flush();
}

class Permanent extends Error {}

function check<T extends { error: { message: string; code?: string } | null }>(res: T): T {
  if (res.error) {
    // 23xxx: constraint (bad data), 42501: not allowed, P0001: plan limit, P0002: its pot is gone
    // — retrying won't help.
    const code = res.error.code ?? '';
    if (/^(23|22|42|P0001|P0002|PGRST1)/.test(code)) throw new Permanent(res.error.message);
    throw new Error(res.error.message);
  }
  return res;
}

async function send(sb: Kain, item: OutboxItem, userId: string): Promise<void> {
  const d = db()!;
  switch (item.kind) {
    case 'log': {
      const log = item.payload as PurchaseLog;
      const { data, error } = await sb.functions.invoke('log-purchase', {
        body: {
          id: log.id,
          ingredient_id: log.ingredientId,
          qty: log.qty,
          total_price: log.totalPrice,
          market_id: log.marketId,
          logged_at: new Date(log.loggedAt).toISOString(),
        },
      });
      if (error) {
        const status = (error as { context?: Response }).context?.status ?? 0;
        if (status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) throw new Permanent(error.message);
        throw error;
      }
      // The server's check is the one that counts.
      const status = (data as { status?: PurchaseLog['status'] })?.status;
      if (status && status !== log.status) await d.logs.update(log.id, { status });
      return;
    }
    case 'family': {
      const f = item.payload as { budget: number; adults: number; kids: number; days: 1 | 7 };
      check(await sb.from('family_settings').upsert({ user_id: userId, budget_per_day: f.budget, adults: f.adults, kids: f.kids, days: f.days }));
      return;
    }
    case 'profile': {
      const p = item.payload as { role?: 'family' | 'eatery'; market_id?: string; display_name?: string };
      check(await sb.from('profiles').update(p).eq('id', userId));
      return;
    }
    case 'menu': {
      const m = item.payload as MenuItem;
      check(
        await sb.from('eatery_menu').upsert({
          id: m.id,
          user_id: userId,
          recipe_id: m.recipeId,
          price: m.price,
          order_g: m.orderG,
          late_price: m.latePrice,
          extras: m.extras,
          position: m.position,
        }),
      );
      return;
    }
    case 'menu-delete':
      check(await sb.from('eatery_menu').delete().eq('id', item.payload as string));
      return;
    case 'pot': {
      const p = item.payload as Pot;
      check(
        await sb.from('pots').upsert({
          id: p.id,
          user_id: userId,
          menu_item_id: p.menuItemId,
          date: p.date,
          cooked_kg: p.cookedKg,
          cooked_at: new Date(p.cookedAt).toISOString(),
        }),
      );
      return;
    }
    case 'pot-delete':
      check(await sb.from('pots').delete().eq('id', item.payload as string));
      return;
    case 'sale': {
      const s = item.payload as PotSale;
      check(
        await sb
          .from('pot_sales')
          .upsert({ id: s.id, pot_id: s.potId, user_id: userId, orders: s.orders, created_at: new Date(s.createdAt).toISOString() }),
      );
      return;
    }
  }
}

let flushing: Promise<void> | null = null;
let again = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Send queued writes now, if online and signed in. */
export function flush(): Promise<void> {
  if (flushing) {
    // Something was queued mid-upload: go round again when this pass ends.
    again = true;
    return flushing;
  }
  flushing = (async () => {
    const d = db();
    const sb = supabase();
    if (!d || !sb || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    await sessionReady();
    const userId = currentSession()?.user.id;
    if (!userId) return;
    const items = await d.outbox.orderBy('seq').toArray();
    for (const item of items) {
      try {
        await send(sb, item, userId);
        await d.outbox.delete(item.seq!);
      } catch (e) {
        if (e instanceof Permanent) {
          console.warn(`Kain: dropped a ${item.kind} that the server refused:`, e.message);
          await d.outbox.delete(item.seq!);
          continue;
        }
        await d.outbox.update(item.seq!, { tries: item.tries + 1 });
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => void flush(), Math.min(60_000, 2_000 * 2 ** Math.min(item.tries, 5)));
        break;
      }
    }
  })().finally(() => {
    flushing = null;
    if (again) {
      again = false;
      void flush();
    }
  });
  return flushing;
}

let wired = false;

/** Flush when the phone comes online, when someone signs in, and at start. */
export function startSync(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('online', () => void flush());
  onSessionChange((s) => {
    if (s.session) void flush();
  });
  void flush();
}

/** Writes still waiting for the server. */
export function usePendingWrites(): number {
  return useLiveQuery(async () => (await db()?.outbox.count()) ?? 0, [], 0);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

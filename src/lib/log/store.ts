'use client';

import { liveQuery, type Subscription } from 'dexie';
import { useSyncExternalStore } from 'react';
import { db, type PurchaseLog } from '@/lib/data/db';

/**
 * This phone's purchase logs, newest first, kept in memory and in step with
 * IndexedDB. One shared subscription, so a screen that appears already has
 * them and renders once (no second render mid-transition).
 */

const EMPTY: PurchaseLog[] = [];
let logs: PurchaseLog[] = EMPTY;
const listeners = new Set<() => void>();
let sub: Subscription | null = null;

function start() {
  const d = db();
  if (!d || sub) return;
  sub = liveQuery(() => d.logs.orderBy('loggedAt').reverse().toArray()).subscribe({
    next: (rows) => {
      logs = rows;
      listeners.forEach((l) => l());
    },
    error: () => {
      /* IndexedDB unavailable: no logs on this phone */
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

/** Start loading logs early (app start), so the first screen that needs them has them. */
export function preloadLogs(): void {
  if (typeof window !== 'undefined') start();
}

export function useLogs(): PurchaseLog[] {
  return useSyncExternalStore(
    subscribe,
    () => logs,
    () => EMPTY,
  );
}

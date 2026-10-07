'use client';

import { liveQuery, type Subscription } from 'dexie';
import { useSyncExternalStore } from 'react';
import { db } from './db';

/**
 * A query on the phone's database, kept in memory and in step with every
 * write. One subscription shared by every screen, started early, so a
 * screen that appears already has the data and renders once.
 */
export function liveStore<T>(query: () => Promise<T>, empty: T) {
  let value = empty;
  let sub: Subscription | null = null;
  const listeners = new Set<() => void>();

  function start() {
    if (sub || typeof window === 'undefined' || !db()) return;
    sub = liveQuery(query).subscribe({
      next: (v) => {
        value = v;
        listeners.forEach((l) => l());
      },
      error: () => {
        /* IndexedDB unavailable: stay empty */
      },
    });
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    start();
    return () => listeners.delete(listener);
  }

  return {
    preload: start,
    get: () => value,
    use: (): T =>
      useSyncExternalStore(
        subscribe,
        () => value,
        () => empty,
      ),
  };
}

'use client';

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

const EVENT = 'kain:device-state';

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A small piece of state kept on this device (localStorage), shared by every
 * screen that reads the same key. Renders `fallback` on the server and
 * during hydration, then the stored value.
 */
export function useDeviceState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const fallbackRef = useRef(fallback);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const handler = (e: Event) => {
        if (e instanceof CustomEvent ? e.detail === key : (e as StorageEvent).key === key) onChange();
      };
      window.addEventListener(EVENT, handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener(EVENT, handler);
        window.removeEventListener('storage', handler);
      };
    },
    [key],
  );
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const value = useMemo<T>(() => {
    if (raw === null) return fallbackRef.current;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallbackRef.current;
    }
  }, [raw]);
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage blocked: the change lasts until reload */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );
  return [value, set];
}

export interface FamilySettings {
  budget: number;
  adults: number;
  kids: number;
  days: 1 | 7;
}

export const DEFAULT_FAMILY: FamilySettings = { budget: 350, adults: 2, kids: 3, days: 7 };

export function useFamily() {
  return useDeviceState<FamilySettings>('kain:family', DEFAULT_FAMILY);
}

export function useMarket() {
  return useDeviceState<string>('kain:market', 'pampang');
}

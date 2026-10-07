'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/**
 * False on the server and during hydration, true after. Screens use it for
 * anything that depends on what's stored on this phone (settings, logs,
 * today's date), so the server never renders numbers that might be wrong.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

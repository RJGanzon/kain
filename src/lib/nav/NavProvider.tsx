'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { startSync } from '@/lib/data/outbox';
import { preloadLogs } from '@/lib/log/store';
import { bindRouter, initNav, onPopState } from './nav';
import { WARM_ROUTES } from './routes';
import { signalCommit } from './transition';

/** Tells waiting transitions that the new route is in the DOM. */
function CommitSignal() {
  const pathname = usePathname();
  const search = useSearchParams();
  useLayoutEffect(() => {
    signalCommit();
  }, [pathname, search]);
  return null;
}

/**
 * Edge swipe-back is for iPhone home-screen installs, where there is no
 * browser back gesture. On Android the system back gesture owns the edge.
 * `localStorage['kain:swipeback'] = '1'` turns it on anywhere, for testing.
 */
function swipeBackWanted(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let forced = false;
  try {
    forced = localStorage.getItem('kain:swipeback') === '1';
  } catch {
    /* storage blocked */
  }
  return iosStandalone || forced;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  useLayoutEffect(() => {
    bindRouter(router);
  }, [router]);

  useEffect(() => {
    initNav();
    preloadLogs();
    startSync();
    document.documentElement.toggleAttribute('data-swipeback', swipeBackWanted());
    // Capture phase on window runs before Next.js's own popstate listener.
    window.addEventListener('popstate', onPopState, { capture: true });
    return () => window.removeEventListener('popstate', onPopState, { capture: true });
  }, []);

  // Once the first screen is idle, load the other screens so no tap waits on the network.
  useEffect(() => {
    const warm = () => WARM_ROUTES.forEach((href) => router.prefetch(href));
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 1500);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <CommitSignal />
      </Suspense>
    </>
  );
}

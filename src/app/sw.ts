/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

/**
 * Kain's service worker (KAIN_BUILD_PROMPT §9): the app shell, fonts and
 * logo are precached at install, screens' data is cached as it's used, so
 * after the first visit the app opens and plans with no connection. Prices
 * and recipes live in IndexedDB, so Supabase calls are never cached here.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Turbopack's worker loader reads its setup from its own URL (#params=…). A cached
      // response would give the worker the cached URL, without that part, and the planner
      // worker would fail to start. So this file isn't precached; it's fetched (or taken
      // from its own cache offline) and answered with a fresh Response, which has no URL
      // of its own, so the worker keeps the URL it asked for.
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/turbopack-worker'),
      handler: async ({ request }) => {
        const cache = await caches.open('kain-worker-loader');
        let res: Response | undefined;
        try {
          res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
        } catch {
          res = await cache.match(request, { ignoreSearch: true });
        }
        if (!res) return Response.error();
        return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
      },
    },
    {
      // Supabase (REST, auth, functions): always live; the app keeps its own copy.
      matcher: ({ url }) => /^\/(rest|auth|functions|storage|realtime)\/v1\//.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/~offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();

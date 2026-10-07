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

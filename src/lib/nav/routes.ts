/** Route facts the navigation layer needs. Keep in sync with src/app. */

export type TabId = 'plan' | 'eatery' | 'log' | 'prices';

/** How a screen is presented, which decides its layer and its transition. */
export type Presentation =
  | 'tab' // a tab's root screen, above the tab bar
  | 'stack' // pushed over its tab root, tab bar stays (Week)
  | 'stack-full' // pushed over its tab root, covers the tab bar (Set budget, Pot)
  | 'full' // stand-alone full screen (Sign in)
  | 'sheet'; // full-screen modal that slides up (Business plan)

/** Android Back from any tab returns here before leaving the app. */
export const START_TAB_URL = '/plan';

export const TAB_ROOTS: Record<TabId, string> = {
  plan: '/plan',
  eatery: '/eatery',
  log: '/log',
  prices: '/prices',
};

export function pathOf(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

export function tabOf(url: string): TabId | null {
  const seg = pathOf(url).split('/')[1];
  return seg === 'plan' || seg === 'eatery' || seg === 'log' || seg === 'prices' ? seg : null;
}

export function isTabRoot(url: string): boolean {
  const tab = tabOf(url);
  return tab !== null && pathOf(url) === TAB_ROOTS[tab];
}

export function presentationOf(url: string): Presentation {
  const path = pathOf(url);
  if (path === '/plan/week') return 'stack';
  if (path === '/plan/setup' || path.startsWith('/eatery/pot/')) return 'stack-full';
  if (path === '/business') return 'sheet';
  if (tabOf(path)) return 'tab';
  return 'full';
}

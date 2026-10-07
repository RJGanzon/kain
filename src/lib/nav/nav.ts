import type { useRouter } from 'next/navigation';
import {
  asEnterKind,
  findBack,
  initStack,
  pushEntry,
  replaceEntry,
  traverse,
  type EnterKind,
  type NavKind,
  type NavStack,
} from './history';
import { presentationOf, START_TAB_URL, tabOf, TAB_ROOTS, type TabId } from './routes';
import { isTransitioning, runTransition, supportsViewTransitions, waitForCommit } from './transition';

/**
 * The one way screens navigate. Every call says what kind of move it is, so
 * the right animation plays, and Kain's history record stays in step with
 * the browser's for Back and Forward.
 */

type Router = ReturnType<typeof useRouter>;

const STORAGE_KEY = 'kain:nav';

let router: Router | null = null;
let stack: NavStack = { entries: [], idx: 0 };
let initialized = false;
let replaying = false;
let skipNextAnimation = false;
let overrideKind: NavKind | null = null;

export function currentUrl(): string {
  return location.pathname + location.search;
}

function normalize(href: string): string {
  const u = new URL(href, location.href);
  return u.pathname + u.search;
}

function save(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    /* storage blocked: keep it in memory */
  }
}

function load(): NavStack | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NavStack) : null;
  } catch {
    return null;
  }
}

export function bindRouter(r: Router): void {
  router = r;
}

/** Set up the history record from this tab's session (survives reloads). */
export function initNav(): void {
  if (initialized) return;
  initialized = true;
  stack = initStack(load(), currentUrl());
  save();
}

type Mode = 'push' | 'replace';

function go(href: string, kind: NavKind, mode: Mode, opts: { animate?: boolean } = {}): void {
  if (!router) return;
  initNav();
  const url = normalize(href);
  if (url === currentUrl()) return;
  // Like a native app, ignore taps while a screen is still sliding in.
  if (isTransitioning() && opts.animate !== false) return;
  stack = mode === 'push' ? pushEntry(stack, url, asEnterKind(kind)) : replaceEntry(stack, url, asEnterKind(kind));
  save();
  const r = router;
  void runTransition(opts.animate === false ? 'none' : kind, () => {
    const committed = waitForCommit();
    if (mode === 'push') r.push(url, { scroll: false });
    else r.replace(url, { scroll: false });
    return committed;
  });
}

export const nav = {
  /** Go forward to a new screen. */
  push(href: string, kind: EnterKind = 'push'): void {
    go(href, kind, 'push');
  },

  /** Swap the current screen without adding history. */
  replace(href: string, kind: NavKind = 'fade', opts?: { animate?: boolean }): void {
    go(href, kind, 'replace', opts);
  },

  /**
   * Go back one screen. Uses real history when there is some (so the
   * browser and Android back stay in step); otherwise replaces with
   * `fallback`, animated as `fallbackKind`.
   */
  back(fallback?: string, fallbackKind: NavKind = 'pop', opts: { animate?: boolean } = {}): void {
    initNav();
    if (stack.idx > 0) {
      if (opts.animate === false) skipNextAnimation = true;
      history.back();
      return;
    }
    if (fallback) go(fallback, fallbackKind, 'replace', opts);
  },

  /** Open a full-screen modal or a bottom sheet. */
  present(href: string): void {
    go(href, 'sheet-up', 'push');
  },

  /** Close a sheet or modal. */
  dismiss(fallback: string, opts?: { animate?: boolean }): void {
    nav.back(fallback, 'sheet-down', opts);
  },

  /**
   * Tab bar tap. Tapping the current tab pops to its root (or scrolls to the
   * top if already there). Moving away from the start tab adds one history
   * entry, so Android Back returns to Plan before leaving the app; moving
   * between other tabs replaces it.
   */
  tab(tab: TabId): void {
    initNav();
    const target = TAB_ROOTS[tab];
    const cur = currentUrl();
    if (tabOf(cur) === tab) {
      if (cur === target) {
        document
          .querySelector<HTMLElement>('[data-screen="tab"]:not([data-covered]) [data-scroll]')
          ?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (stack.entries[stack.idx - 1]?.url === target) {
        history.back();
        return;
      }
      go(target, presentationOf(cur) === 'stack-full' ? 'pop-full' : 'pop', 'replace');
      return;
    }
    const startIdx = target === START_TAB_URL ? findBack(stack, START_TAB_URL) : -1;
    if (startIdx >= 0) {
      if (isTransitioning()) return;
      overrideKind = 'tab';
      history.go(startIdx - stack.idx);
      return;
    }
    go(target, 'tab', cur === START_TAB_URL ? 'push' : 'replace');
  },

  /** The next Back should not animate (a swipe-back already moved the screen). */
  skipNextAnimation(): void {
    skipNextAnimation = true;
  },

  canGoBack(): boolean {
    initNav();
    return stack.idx > 0;
  },
};

/**
 * Back/Forward from outside the app (Android back, browser buttons, iOS
 * swipe). Next.js handles popstate itself; to animate it, we hold the event
 * back, start a view transition, and replay it inside the transition so
 * Next updates the DOM after the old screen has been captured.
 */
export function onPopState(event: PopStateEvent): void {
  if (replaying) return;
  initNav();
  const moved = traverse(stack, currentUrl());
  stack = moved.stack;
  save();

  let kind: NavKind = overrideKind ?? moved.kind;
  overrideKind = null;
  const uaAnimated = (event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true;
  if (skipNextAnimation || uaAnimated) kind = 'none';
  skipNextAnimation = false;
  if (kind === 'none' || !supportsViewTransitions()) return;

  event.stopImmediatePropagation();
  const state: unknown = event.state;
  void runTransition(kind, () => {
    const committed = waitForCommit();
    replaying = true;
    try {
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
    } finally {
      replaying = false;
    }
    return committed;
  });
}

import type { NavKind } from './history';

/** In-screen transitions (Eatery's two views). */
export type ScreenKind = 'seg-next' | 'seg-prev';

export type TransitionKind = NavKind | ScreenKind;

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let token = 0;
let active: ViewTransition | null = null;

/** True while a screen transition is animating. */
export function isTransitioning(): boolean {
  return active !== null;
}

/**
 * Run `update` (which changes the DOM) inside a view transition tagged `kind`.
 * The tag goes on <html data-nav="…"> and motion.css picks the animation.
 * Without View Transitions (or for `none`) the update just runs.
 * With "reduce motion" on, every kind becomes a short cross-fade.
 */
export function runTransition(kind: TransitionKind, update: () => void | Promise<void>): Promise<void> {
  if (kind === 'none' || !supportsViewTransitions() || document.visibilityState === 'hidden') {
    return Promise.resolve().then(update);
  }
  const html = document.documentElement;
  const mine = ++token;
  performance.mark('kain:transition');
  html.dataset.nav = prefersReducedMotion() ? 'fade' : kind;
  let vt: ViewTransition;
  try {
    vt = document.startViewTransition(() => {
      performance.mark('kain:update');
      return update();
    });
  } catch {
    delete html.dataset.nav;
    return Promise.resolve().then(update);
  }
  active = vt;
  vt.ready.catch(() => {});
  vt.finished
    .catch(() => {})
    .finally(() => {
      if (token === mine) {
        delete html.dataset.nav;
        active = null;
      }
    });
  return vt.updateCallbackDone.catch(() => {});
}

/* ------------------------------------------------------------------
   Route commits. A navigation's view transition must wait until the
   new route is in the DOM; <CommitSignal> calls signalCommit() from a
   layout effect when the pathname or search params change.
   ------------------------------------------------------------------ */

let waiters: Array<() => void> = [];

export function waitForCommit(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    waiters.push(finish);
    setTimeout(finish, timeoutMs);
  });
}

export function signalCommit(): void {
  if (waiters.length) performance.mark('kain:commit');
  const pending = waiters;
  waiters = [];
  for (const finish of pending) finish();
}

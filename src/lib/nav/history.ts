/**
 * Kain's own record of the browser history stack, so every Back and Forward
 * (in-app button, Android back gesture, browser buttons) knows which
 * direction it goes and which animation to play. Pure functions: easy to test.
 */

/** How a history entry was entered. */
export type EnterKind = 'push' | 'push-full' | 'forward' | 'tab' | 'sheet-up' | 'fade' | 'none';

/** Every transition the CSS knows. */
export type NavKind = EnterKind | 'pop' | 'pop-full' | 'backward' | 'sheet-down';

export interface Entry {
  url: string;
  kind: EnterKind;
}

export interface NavStack {
  entries: Entry[];
  idx: number;
}

/** The animation that undoes an entry's way in. */
export function inverse(kind: EnterKind): NavKind {
  switch (kind) {
    case 'push':
      return 'pop';
    case 'push-full':
      return 'pop-full';
    case 'forward':
      return 'backward';
    case 'sheet-up':
      return 'sheet-down';
    default:
      return kind;
  }
}

/** What to record for an entry that was replaced using `kind`. */
export function asEnterKind(kind: NavKind): EnterKind {
  switch (kind) {
    case 'pop':
    case 'pop-full':
    case 'backward':
    case 'sheet-down':
      return 'fade';
    default:
      return kind;
  }
}

export function initStack(saved: NavStack | null, url: string): NavStack {
  if (saved && Array.isArray(saved.entries) && saved.entries[saved.idx]?.url === url) return saved;
  return { entries: [{ url, kind: 'none' }], idx: 0 };
}

export function pushEntry(stack: NavStack, url: string, kind: EnterKind): NavStack {
  const entries = stack.entries.slice(0, stack.idx + 1);
  entries.push({ url, kind });
  return { entries, idx: entries.length - 1 };
}

export function replaceEntry(stack: NavStack, url: string, kind: EnterKind): NavStack {
  const entries = stack.entries.slice();
  entries[stack.idx] = { url, kind };
  return { entries, idx: stack.idx };
}

/** The browser moved to `url` (popstate). Work out where we are and how to animate. */
export function traverse(stack: NavStack, url: string): { stack: NavStack; kind: NavKind } {
  const { entries, idx } = stack;
  if (entries[idx - 1]?.url === url) {
    return { stack: { entries, idx: idx - 1 }, kind: inverse(entries[idx].kind) };
  }
  if (entries[idx + 1]?.url === url) {
    return { stack: { entries, idx: idx + 1 }, kind: entries[idx + 1].kind };
  }
  // A jump of several entries (history.go(-n)): find the nearest match.
  for (let d = 2; d < entries.length; d++) {
    if (entries[idx - d]?.url === url) return { stack: { entries, idx: idx - d }, kind: 'fade' };
    if (entries[idx + d]?.url === url) return { stack: { entries, idx: idx + d }, kind: 'fade' };
  }
  return { stack: { entries: [{ url, kind: 'none' }], idx: 0 }, kind: 'fade' };
}

/** Index of the closest earlier entry showing `url`, or -1. */
export function findBack(stack: NavStack, url: string): number {
  for (let i = stack.idx - 1; i >= 0; i--) if (stack.entries[i].url === url) return i;
  return -1;
}

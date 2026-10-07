import { describe, expect, it } from 'vitest';
import { findBack, initStack, inverse, pushEntry, replaceEntry, traverse, type NavStack } from './history';

const start = (): NavStack => initStack(null, '/plan');

describe('nav history stack', () => {
  it('starts with the current url', () => {
    expect(start()).toEqual({ entries: [{ url: '/plan', kind: 'none' }], idx: 0 });
  });

  it('keeps a saved stack only when it still points at the current url', () => {
    const saved = pushEntry(start(), '/plan/week', 'push');
    expect(initStack(saved, '/plan/week')).toBe(saved);
    expect(initStack(saved, '/prices').entries).toEqual([{ url: '/prices', kind: 'none' }]);
  });

  it('plays the inverse animation when going back, and the same one going forward', () => {
    const pushed = pushEntry(start(), '/plan/week', 'push');
    const back = traverse(pushed, '/plan');
    expect(back.kind).toBe('pop');
    expect(back.stack.idx).toBe(0);
    const fwd = traverse(back.stack, '/plan/week');
    expect(fwd.kind).toBe('push');
    expect(fwd.stack.idx).toBe(1);
  });

  it('maps every way in to its way out', () => {
    expect(inverse('push-full')).toBe('pop-full');
    expect(inverse('sheet-up')).toBe('sheet-down');
    expect(inverse('forward')).toBe('backward');
    expect(inverse('tab')).toBe('tab');
  });

  it('drops forward entries after a new push', () => {
    let s = pushEntry(start(), '/plan/week', 'push');
    s = traverse(s, '/plan').stack;
    s = pushEntry(s, '/plan/setup', 'push-full');
    expect(s.entries.map((e) => e.url)).toEqual(['/plan', '/plan/setup']);
  });

  it('replaces in place, so a tab switch after a push still goes back to the start tab', () => {
    let s = pushEntry(start(), '/plan/week', 'push');
    s = replaceEntry(s, '/eatery', 'tab');
    expect(s.entries.map((e) => e.url)).toEqual(['/plan', '/eatery']);
    expect(traverse(s, '/plan').kind).toBe('tab');
  });

  it('handles sheets as their own history entry', () => {
    const s = pushEntry(start(), '/plan?sheet=market', 'sheet-up');
    expect(traverse(s, '/plan').kind).toBe('sheet-down');
  });

  it('finds multi-step jumps and unknown urls', () => {
    let s = pushEntry(start(), '/eatery', 'tab');
    s = pushEntry(s, '/eatery/pot/adobong-manok', 'push-full');
    expect(findBack(s, '/plan')).toBe(0);
    const jump = traverse(s, '/plan');
    expect(jump.stack.idx).toBe(0);
    expect(jump.kind).toBe('fade');
    const lost = traverse(s, '/somewhere');
    expect(lost.stack).toEqual({ entries: [{ url: '/somewhere', kind: 'none' }], idx: 0 });
  });
});

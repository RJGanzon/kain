'use client';

import { use, useCallback, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useSwipeBack } from './gestures';
import { nav } from './nav';
import type { Presentation } from './routes';
import { CoveredContext } from './StackHost';

/** Scroll positions of tab roots, so switching tabs and back keeps your place. */
const scrollMemory = new Map<string, number>();

function useScrollMemory(ref: RefObject<HTMLElement | null>, key: string | undefined) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !key) return;
    const saved = scrollMemory.get(key);
    if (saved) el.scrollTop = saved;
    const onScroll = () => scrollMemory.set(key, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref, key]);
}

/**
 * Every screen sits in one of these. It places the screen on the right
 * layer for its presentation (see motion.css), owns the scroll container,
 * remembers scroll position for tab roots, and adds edge swipe-back to
 * pushed screens.
 */
export function Screen({
  presentation,
  label,
  children,
  footer,
  scrollKey,
  backFallback,
  className,
  scrollClassName,
}: {
  presentation: Presentation;
  /** Accessible name of the screen. */
  label: string;
  children: ReactNode;
  /** Pinned to the bottom, outside the scroll area (primary actions). */
  footer?: ReactNode;
  /** Tab roots: remember scroll position under this key. */
  scrollKey?: string;
  /** Pushed screens: where Back goes when there is no history (a deep link). */
  backFallback?: string;
  className?: string;
  scrollClassName?: string;
}) {
  const covered = use(CoveredContext) && presentation === 'tab';
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pushed = presentation === 'stack' || presentation === 'stack-full';

  useScrollMemory(scrollRef, presentation === 'tab' ? scrollKey : undefined);

  const onSwipeBack = useCallback(
    () => nav.back(backFallback, presentation === 'stack-full' ? 'pop-full' : 'pop', { animate: false }),
    [backFallback, presentation],
  );
  useSwipeBack(sectionRef, { enabled: pushed, full: presentation === 'stack-full', onBack: onSwipeBack });

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      data-screen={presentation}
      data-covered={covered ? '' : undefined}
      inert={covered}
      className={cn('screen', `screen-${presentation}`, className)}
    >
      <div ref={scrollRef} data-scroll className={cn('screen-scroll', scrollClassName)}>
        {children}
      </div>
      {footer ? <div className="screen-footer">{footer}</div> : null}
    </section>
  );
}

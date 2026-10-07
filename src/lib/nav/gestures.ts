'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { waitForCommit } from './transition';

const EDGE = 24; // px from the left edge where a swipe-back can start
const COMMIT_PROGRESS = 0.35;
const COMMIT_VELOCITY = 0.5; // px per ms
const UNDER_SHIFT = 30; // % the screen underneath sits to the left

interface Sample {
  v: number;
  t: number;
}

function velocity(samples: Sample[]): number {
  const last = samples[samples.length - 1];
  const first = samples.find((s) => last.t - s.t <= 100) ?? samples[0];
  const dt = last.t - first.t;
  return dt > 0 ? (last.v - first.v) / dt : 0;
}

function settle(el: HTMLElement, from: string, to: string, duration: number): Animation {
  return el.animate([{ transform: from }, { transform: to }], {
    duration,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    fill: 'forwards',
  });
}

function clearStyle(el: HTMLElement | null): void {
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.style.transform = '';
  el.style.filter = '';
}

/**
 * iOS-style interactive back: drag a pushed screen from the left edge; the
 * live screen underneath slides in from 30% left. Release past 35% or with
 * a flick to go back; otherwise it springs back. Only active when
 * <html data-swipeback> is set (see NavProvider).
 */
export function useSwipeBack(
  ref: RefObject<HTMLElement | null>,
  { enabled, full, onBack }: { enabled: boolean; full: boolean; onBack: () => void },
): void {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const html = document.documentElement;

    let drag: null | {
      id: number;
      x0: number;
      y0: number;
      width: number;
      active: boolean;
      samples: Sample[];
      under: HTMLElement | null;
      bar: HTMLElement | null;
    } = null;

    const apply = (p: number) => {
      if (!drag) return;
      el.style.transform = `translateX(${p * drag.width}px)`;
      const shift = `translateX(${-UNDER_SHIFT * (1 - p)}%)`;
      const filter = `brightness(${0.94 + 0.06 * p})`;
      for (const under of [drag.under, drag.bar]) {
        if (!under) continue;
        under.style.transform = shift;
        under.style.filter = filter;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!html.hasAttribute('data-swipeback') || drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      if (e.clientX - rect.left > EDGE) return;
      drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        width: rect.width,
        active: false,
        samples: [{ v: e.clientX, t: e.timeStamp }],
        under: null,
        bar: null,
      };
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          drag = null;
          return;
        }
        if (dx < 10 || dx < Math.abs(dy) * 1.2) return;
        drag.active = true;
        el.setPointerCapture(e.pointerId);
        drag.under = document.querySelector<HTMLElement>('[data-covered]');
        drag.bar = full ? document.querySelector<HTMLElement>('.tabbar') : null;
        el.getAnimations().forEach((a) => a.cancel());
      }
      e.preventDefault();
      drag.samples.push({ v: e.clientX, t: e.timeStamp });
      if (drag.samples.length > 12) drag.samples.shift();
      apply(Math.max(0, Math.min(1, dx / drag.width)));
    };

    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.active) return;
      const dx = Math.max(0, e.clientX - d.x0);
      const p = Math.min(1, dx / d.width);
      const v = e.type === 'pointercancel' ? 0 : velocity(d.samples);
      const commit = (p > COMMIT_PROGRESS && v > -0.2) || v > COMMIT_VELOCITY;
      const duration = Math.round(Math.max(140, 320 * (commit ? 1 - p : p)));
      const unders = [d.under, d.bar].filter((u): u is HTMLElement => u !== null);
      const done = settle(el, `translateX(${dx}px)`, commit ? 'translateX(100%)' : 'translateX(0)', duration);
      for (const u of unders) {
        settle(u, `translateX(${-UNDER_SHIFT * (1 - p)}%)`, commit ? 'translateX(0)' : `translateX(-${UNDER_SHIFT}%)`, duration);
      }
      done.finished
        .then(() => {
          if (commit) {
            onBackRef.current();
            void waitForCommit().then(() => unders.forEach(clearStyle));
          } else {
            clearStyle(el);
            unders.forEach(clearStyle);
          }
        })
        .catch(() => {
          clearStyle(el);
          unders.forEach(clearStyle);
        });
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [ref, enabled, full]);
}

/**
 * Drag a bottom sheet down by its handle to close it. Release past 25% of
 * its height or with a downward flick to close; otherwise it springs back.
 */
export function useSheetDrag(
  ref: RefObject<HTMLElement | null>,
  { enabled, onClose }: { enabled: boolean; onClose: () => void },
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const panel = ref.current;
    if (!panel || !enabled) return;
    const scrim = panel.parentElement?.querySelector<HTMLElement>('.sheet-scrim') ?? null;
    let drag: null | { id: number; y0: number; height: number; samples: Sample[] } = null;

    const onDown = (e: PointerEvent) => {
      const handle = (e.target as HTMLElement).closest('[data-sheet-handle]');
      if (!handle || drag) return;
      drag = { id: e.pointerId, y0: e.clientY, height: panel.offsetHeight, samples: [{ v: e.clientY, t: e.timeStamp }] };
      panel.setPointerCapture(e.pointerId);
      panel.getAnimations().forEach((a) => a.cancel());
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      const dy = Math.max(0, e.clientY - drag.y0);
      drag.samples.push({ v: e.clientY, t: e.timeStamp });
      if (drag.samples.length > 12) drag.samples.shift();
      panel.style.transform = `translateY(${dy}px)`;
      if (scrim) scrim.style.opacity = String(1 - Math.min(1, dy / drag.height));
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      const dy = Math.max(0, e.clientY - d.y0);
      const v = e.type === 'pointercancel' ? 0 : velocity(d.samples);
      const close = dy > d.height * 0.25 || v > COMMIT_VELOCITY;
      const duration = Math.round(Math.max(140, 280 * (close ? 1 - dy / d.height : dy / d.height)));
      const anim = settle(panel, `translateY(${dy}px)`, close ? 'translateY(100%)' : 'translateY(0)', duration);
      scrim?.animate([{ opacity: scrim.style.opacity || '1' }, { opacity: close ? '0' : '1' }], {
        duration,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'forwards',
      });
      const reset = () => {
        clearStyle(panel);
        if (scrim) {
          scrim.getAnimations().forEach((a) => a.cancel());
          scrim.style.opacity = '';
        }
      };
      anim.finished
        .then(() => {
          if (close) onCloseRef.current();
          else reset();
        })
        .catch(reset);
    };

    panel.addEventListener('pointerdown', onDown);
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
    panel.addEventListener('pointercancel', onUp);
    return () => {
      panel.removeEventListener('pointerdown', onDown);
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
      panel.removeEventListener('pointercancel', onUp);
    };
  }, [ref, enabled]);
}

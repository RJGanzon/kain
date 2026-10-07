import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { clamp } from '@/lib/format';

/**
 * A horizontal bar (progress, nutrition, sold). The fill grows in when it
 * first appears and eases to new values (see .meter-fill in motion.css).
 */
export function Meter({
  value,
  height = 10,
  trackClassName = 'bg-track',
  fillClassName = 'bg-ink',
  fillColor,
  label,
  className,
}: {
  /** 0..1 */
  value: number;
  height?: number;
  trackClassName?: string;
  fillClassName?: string;
  fillColor?: string;
  label?: string;
  className?: string;
}) {
  const style = { height, '--meter': `${clamp(value, 0, 1) * 100}%` } as CSSProperties;
  return (
    <div
      className={cn('overflow-hidden rounded-full', trackClassName, className)}
      style={{ height }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <div
        className={cn('meter-fill rounded-full', fillClassName)}
        style={fillColor ? { ...style, background: fillColor } : style}
      />
    </div>
  );
}

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

/** 88 px ring: nutrition met as a percentage (Today's plan hero). */
export function NutritionRing({ value }: { value: number }) {
  const v = clamp(value, 0, 1);
  return (
    <div className="relative size-[88px] flex-none" role="img" aria-label={`${Math.round(v * 100)}% of nutrition needs met`}>
      <svg width="88" height="88" viewBox="0 0 88 88" className="block -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={RING_R} fill="none" stroke="rgba(20,18,16,0.14)" strokeWidth="9" />
        <circle
          className="ring-fill"
          cx="44"
          cy="44"
          r={RING_R}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="9"
          strokeLinecap="round"
          style={{ '--ring': `${(v * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`, '--ring-zero': `0 ${RING_C.toFixed(1)}` } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-[20px] leading-none font-extrabold">{Math.round(v * 100)}%</span>
        <span className="text-[10px] font-bold text-on-brand">nutrition</span>
      </div>
    </div>
  );
}

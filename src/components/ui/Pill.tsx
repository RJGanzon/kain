import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type PillTone =
  | 'good'
  | 'warn'
  | 'bad'
  | 'steady'
  | 'brand'
  | 'ink'
  | 'white'
  | 'tier-contributor'
  | 'tier-log'
  | 'tier-da'
  | 'tier-avg'
  | 'tier-est';

const TONES: Record<PillTone, string> = {
  good: 'bg-good-bg text-good',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
  steady: 'bg-track text-tier-est-fg',
  brand: 'bg-brand text-ink',
  ink: 'bg-ink text-brand',
  white: 'bg-white text-ink',
  'tier-contributor': 'bg-good-bg text-good',
  'tier-log': 'bg-good-bg text-good',
  'tier-da': 'bg-brand-tint text-tier-da-fg',
  'tier-avg': 'bg-track text-ink-soft',
  'tier-est': 'border border-dashed border-tier-est-border text-tier-est-fg',
};

/** Small rounded status label: "Price added", "▲ 41%", "46% margin". No emoji. */
export function Pill({
  tone = 'steady',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Marks sample prices so they are never mistaken for real market prices. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Pill tone="tier-est" className={cn('px-[7px] py-px font-bold', className)}>
      Sample data
    </Pill>
  );
}

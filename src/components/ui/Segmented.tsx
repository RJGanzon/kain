'use client';

import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control: surface track with 4 px padding; the selected segment is
 * a white pill with a soft shadow that slides between options.
 * `transitionName` opts the thumb into an in-screen view transition (one per screen).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  height = 38,
  transitionName,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  height?: number;
  transitionName?: boolean;
}) {
  const n = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid gap-1 rounded-full bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        data-vt-seg-thumb={transitionName ? '' : undefined}
        className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-seg transition-transform duration-[250ms] ease-emphasized"
        style={{
          width: `calc((100% - ${8 + (n - 1) * 4}px) / ${n})`,
          transform: `translateX(calc(${index} * (100% + 4px)))`,
        }}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(o.value)}
            className={cn('press relative z-[1] rounded-full text-[14px] font-bold text-ink')}
            style={{ height }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

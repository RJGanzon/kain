'use client';

import { Minus, Plus } from 'lucide-react';

/** Row with a label, a − button, the value and a + button (Set budget). */
export function Stepper({
  label,
  sub,
  value,
  min,
  max,
  onChange,
  noun,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Used in the button labels: "Fewer adults", "More adults". */
  noun: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-1">
        <div className="text-[16px] font-bold">{label}</div>
        <div className="text-[13px] text-muted">{sub}</div>
      </div>
      <button
        type="button"
        aria-label={`Fewer ${noun}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="press flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink disabled:text-line-strong"
      >
        <Minus size={20} strokeWidth={2.2} />
      </button>
      <output aria-live="polite" className="w-7 text-center text-[20px] font-extrabold">
        {value}
      </output>
      <button
        type="button"
        aria-label={`More ${noun}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="press flex size-11 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40"
      >
        <Plus size={20} strokeWidth={2.2} />
      </button>
    </div>
  );
}

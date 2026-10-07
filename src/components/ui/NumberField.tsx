'use client';

import { useId } from 'react';

/** A labelled number input sized for thumbs: ₱ or a unit beside the value. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  decimal = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  decimal?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <div className="flex h-12 items-center gap-1.5 rounded-[14px] bg-surface px-3.5">
        {prefix ? <span className="text-[16px] font-extrabold text-muted">{prefix}</span> : null}
        <input
          id={id}
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, ''))}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-extrabold text-ink outline-none"
        />
        {suffix ? <span className="text-[14px] font-bold text-muted">{suffix}</span> : null}
      </div>
      {hint ? <div className="text-[12px] text-muted">{hint}</div> : null}
    </div>
  );
}

/** Parse what was typed ("4,5" works too); NaN when empty. */
export function toNumber(v: string): number {
  return v.trim() === '' ? NaN : Number(v.replace(',', '.'));
}

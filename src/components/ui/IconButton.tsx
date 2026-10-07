import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type IconButtonTone = 'surface' | 'ink' | 'glass';

const TONES: Record<IconButtonTone, string> = {
  surface: 'bg-surface text-ink',
  ink: 'bg-ink text-white',
  glass: 'bg-white/60 text-ink',
};

/** 44×44 circle. */
export function iconButtonClass(tone: IconButtonTone = 'surface', className?: string): string {
  return cn(
    'press flex size-11 flex-none items-center justify-center rounded-full border-0 no-underline',
    TONES[tone],
    className,
  );
}

export function IconButton({
  tone = 'surface',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: IconButtonTone; 'aria-label': string }) {
  return <button type={type} className={iconButtonClass(tone, className)} {...props} />;
}

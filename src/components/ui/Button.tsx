import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'ink' | 'outline' | 'brand' | 'quiet';

const VARIANTS: Record<ButtonVariant, string> = {
  ink: 'bg-ink text-white',
  outline: 'bg-white text-ink border border-line-strong',
  brand: 'bg-brand text-ink',
  quiet: 'bg-white text-ink border border-line',
};

/**
 * Class string for a button-shaped control, so links can look like buttons.
 * Default is the primary button: ink, 56 px tall, radius 18, 16/800 white.
 */
export function buttonClass(variant: ButtonVariant = 'ink', className?: string): string {
  return cn(
    'press flex h-14 w-full items-center justify-center gap-2.5 rounded-[18px] text-[16px] font-extrabold no-underline select-none',
    VARIANTS[variant],
    className,
  );
}

export function Button({
  variant = 'ink',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

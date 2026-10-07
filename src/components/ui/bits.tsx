import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Rounded square holding an icon (meal rows, shopping list, alerts). */
export function IconTile({
  children,
  size = 48,
  radius = 14,
  className,
}: {
  children: ReactNode;
  size?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-none items-center justify-center', className)}
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/** Green check in a circle, with a title and a caption (Sign in, Business plan). */
export function FeatureCheck({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-good-bg" aria-hidden="true">
        <Check size={14} strokeWidth={3} className="text-good" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-[1.3] font-bold">{title}</div>
        <div className="text-[12px] text-muted">{sub}</div>
      </div>
    </div>
  );
}

/** Uppercase label above a row title: ALMUSAL, COOKED. */
export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-[11px] font-bold tracking-[0.06em] text-muted uppercase', className)}>{children}</div>
  );
}

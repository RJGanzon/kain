import { cn } from '@/lib/cn';

/** A quiet placeholder block, the size of the text or number it stands in for. */
export function Skeleton({ className, dark = false }: { className?: string; dark?: boolean }) {
  return <span aria-hidden="true" className={cn('inline-block rounded-[8px] align-middle', dark ? 'bg-[rgba(20,18,16,0.12)]' : 'bg-track', className)} />;
}

'use client';

import { CloudOff } from 'lucide-react';
import { useSession } from '@/lib/auth/session';
import { useOnline, usePendingWrites } from '@/lib/data/outbox';

/**
 * "Saved, will sync": shown while a signed-in person's changes are waiting
 * on the phone for a connection (KAIN_BUILD_PROMPT §9).
 */
export function SyncNote({ className }: { className?: string }) {
  const { session } = useSession();
  const pending = usePendingWrites();
  const online = useOnline();
  if (!session || pending === 0) return null;
  return (
    <span className={className ?? 'inline-flex items-center gap-1 text-[12px] font-bold whitespace-nowrap text-muted'}>
      <CloudOff size={13} strokeWidth={2.4} aria-hidden="true" />
      {online ? 'Saving…' : 'Saved, will sync'}
    </span>
  );
}

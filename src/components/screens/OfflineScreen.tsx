'use client';

import { WifiOff } from 'lucide-react';
import { IconTile } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/Button';
import { Screen } from '@/lib/nav/Screen';

export function OfflineScreen() {
  return (
    <Screen presentation="full" label="Offline">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <IconTile size={56} radius={18} className="bg-surface">
          <WifiOff size={26} strokeWidth={2.2} />
        </IconTile>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">You&apos;re offline</h1>
        <p className="max-w-xs text-[14px] leading-[1.45] text-muted">
          This screen hasn&apos;t been opened on this phone yet. Your plan, prices and logs still work offline.
        </p>
        <a href="/plan" className={buttonClass('ink', 'max-w-xs')}>
          Open my plan
        </a>
      </div>
    </Screen>
  );
}

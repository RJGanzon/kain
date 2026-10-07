'use client';

import { Download, Share, X } from 'lucide-react';
import { IconTile } from '@/components/ui/bits';
import { dismissInstall, install, useInstallMode } from '@/lib/pwa/install';

/** Offer to install Kain to the home screen: opens like an app and works offline. */
export function InstallCard() {
  const mode = useInstallMode();
  if (!mode) return null;
  return (
    <section aria-label="Install Kain" className="flex items-start gap-3 rounded-[20px] border border-line p-4">
      <IconTile size={40} radius={12} className="bg-brand-tint">
        {mode === 'prompt' ? <Download size={20} strokeWidth={2.2} /> : <Share size={20} strokeWidth={2.2} />}
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">Put Kain on your home screen</div>
        <p className="text-[13px] leading-[1.45] text-muted">
          {mode === 'prompt'
            ? 'It opens like an app and works without signal at the market.'
            : 'Tap Share, then “Add to Home Screen”. It opens like an app and works without signal.'}
        </p>
        {mode === 'prompt' ? (
          <button type="button" onClick={() => void install()} className="press mt-2 h-10 rounded-[12px] bg-ink px-4 text-[14px] font-extrabold text-white">
            Install
          </button>
        ) : null}
      </div>
      <button type="button" aria-label="Not now" onClick={dismissInstall} className="press -m-2 flex size-11 flex-none items-center justify-center text-muted">
        <X size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </section>
  );
}

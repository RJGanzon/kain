'use client';

import Image from 'next/image';
import facebookLogo from '@/assets/facebook-logo.png';
import googleG from '@/assets/google-g.svg';
import { cn } from '@/lib/cn';
import type { Provider } from '@/lib/auth/providers';

/**
 * "Continue with Google" and "Continue with Facebook", using the official
 * logo files (Google's sign-in assets, Meta's brand asset pack), unaltered.
 * Google: its dark theme (#131314 fill, #8E918F outline, #E3E3E3 text).
 * Facebook: the blue "f" on white, with clear space around it.
 */
export function ProviderButtons({ onPick, busy }: { onPick: (p: Provider) => void; busy?: Provider | null }) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => onPick('google')}
        className="press flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] border border-[#8E918F] bg-[#131314] text-[16px] font-semibold text-[#E3E3E3] disabled:opacity-70"
      >
        <Image src={googleG} alt="" width={20} height={20} className="flex-none" aria-hidden="true" />
        Continue with Google
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => onPick('facebook')}
        className={cn(
          'press flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] border border-line-strong bg-white text-[16px] font-semibold text-ink disabled:opacity-70',
        )}
      >
        <Image src={facebookLogo} alt="" width={24} height={24} className="flex-none" aria-hidden="true" />
        Continue with Facebook
      </button>
    </div>
  );
}

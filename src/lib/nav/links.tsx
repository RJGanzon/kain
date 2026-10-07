'use client';

import Link from 'next/link';
import { ChevronLeft, X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { iconButtonClass, type IconButtonTone } from '@/components/ui/IconButton';
import type { EnterKind, NavKind } from './history';
import { nav } from './nav';

/**
 * A link that navigates through `nav`, so it animates. Still a real <a>
 * with an href: prefetched by Next.js, and Ctrl/Cmd-click opens a new tab.
 */
export function NavLink({
  href,
  kind = 'push',
  replace = false,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href' | 'replace' | 'onNavigate'> & {
  href: string;
  kind?: EnterKind | NavKind;
  replace?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onNavigate={(e) => {
        e.preventDefault();
        if (kind === 'sheet-up') nav.present(href);
        else if (replace) nav.replace(href, kind);
        else nav.push(href, kind as EnterKind);
      }}
      {...props}
    />
  );
}

/** The 44 px round Back (or Close) button in screen headers. */
export function BackButton({
  fallback,
  kind = 'pop',
  label = 'Back',
  icon = 'back',
  tone = 'surface',
}: {
  fallback: string;
  kind?: NavKind;
  label?: string;
  icon?: 'back' | 'close';
  tone?: IconButtonTone;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={iconButtonClass(tone)}
      onClick={() => (kind === 'sheet-down' ? nav.dismiss(fallback) : nav.back(fallback, kind))}
    >
      {icon === 'close' ? <X size={18} strokeWidth={2.6} /> : <ChevronLeft size={20} strokeWidth={2.4} />}
    </button>
  );
}

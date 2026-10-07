'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, Soup, Store, Tag, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { nav } from '@/lib/nav/nav';
import { isTabRoot, tabOf, TAB_ROOTS, type TabId } from '@/lib/nav/routes';

const TABS: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'plan', label: 'Plan', Icon: Soup },
  { id: 'eatery', label: 'Eatery', Icon: Store },
  { id: 'log', label: 'Log', Icon: Mic },
  { id: 'prices', label: 'Prices', Icon: Tag },
];

export const LAST_TAB_KEY = 'kain:lastTab';

/**
 * Bottom tab bar: 4 equal tabs. The active tab's icon sits in a yellow pill
 * that slides to the tapped tab (named `tab-pill` during tab transitions).
 */
export function TabBar() {
  const pathname = usePathname();
  const active = tabOf(pathname);

  useEffect(() => {
    if (!isTabRoot(pathname)) return;
    try {
      localStorage.setItem(LAST_TAB_KEY, pathname);
    } catch {
      /* storage blocked */
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Main"
      className="tabbar absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-white px-3 pt-2"
      style={{ height: 'var(--tabbar-h)', paddingBottom: 'var(--tabbar-pad-b)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <Link
            key={id}
            href={TAB_ROOTS[id]}
            scroll={false}
            aria-current={on ? 'page' : undefined}
            onNavigate={(e) => {
              e.preventDefault();
              nav.tab(id);
            }}
            className={cn(
              'flex flex-col items-center gap-1 text-[11px] no-underline select-none',
              on ? 'font-extrabold text-ink' : 'font-bold text-muted',
            )}
          >
            <span className={cn('flex h-[30px] w-14 items-center justify-center rounded-full', on && 'tab-pill bg-brand')}>
              <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import { useEffect } from 'react';
import { LAST_TAB_KEY } from '@/components/TabBar';
import { nav } from '@/lib/nav/nav';
import { isTabRoot } from '@/lib/nav/routes';

/** Opens the last tab used, or the welcome screen on a first visit. */
export default function Index() {
  useEffect(() => {
    let target = '/welcome';
    try {
      const last = localStorage.getItem(LAST_TAB_KEY);
      if (last && isTabRoot(last)) target = last;
    } catch {
      /* storage blocked: start at the welcome screen */
    }
    nav.replace(target, 'none');
  }, []);
  return null;
}

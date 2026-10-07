'use client';

import { usePathname } from 'next/navigation';
import { createContext, type ReactNode } from 'react';

/** True for a tab's root screen while a pushed screen sits on top of it. */
export const CoveredContext = createContext(false);

/**
 * Keeps a tab's root screen mounted underneath the screens pushed over it,
 * so going back is instant, keeps scroll and state, and an edge swipe can
 * reveal the real screen rather than a picture of it.
 */
export function StackHost({ rootPath, root, children }: { rootPath: string; root: ReactNode; children: ReactNode }) {
  const covered = usePathname() !== rootPath;
  return (
    <>
      <CoveredContext value={covered}>{root}</CoveredContext>
      {children}
    </>
  );
}

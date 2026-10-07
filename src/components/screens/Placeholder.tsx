'use client';

import type { EnterKind, NavKind } from '@/lib/nav/history';
import { BackButton, NavLink } from '@/lib/nav/links';
import type { Presentation } from '@/lib/nav/routes';
import { Screen } from '@/lib/nav/Screen';

/** Temporary screen used while the navigation shell is built (Phase 2c). */
export function Placeholder({
  title,
  presentation,
  links = [],
  back,
  scrollKey,
}: {
  title: string;
  presentation: Presentation;
  links?: Array<{ href: string; label: string; kind: EnterKind | NavKind; replace?: boolean }>;
  back?: { fallback: string; kind: NavKind };
  scrollKey?: string;
}) {
  return (
    <Screen presentation={presentation} label={title} scrollKey={scrollKey} backFallback={back?.fallback}>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        {back ? <BackButton fallback={back.fallback} kind={back.kind} /> : null}
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">{title}</h1>
        {links.map((l) => (
          <NavLink key={l.href} href={l.href} kind={l.kind} replace={l.replace} className="press rounded-[20px] bg-surface px-4 py-3.5 text-[15px] font-bold no-underline">
            {l.label}
          </NavLink>
        ))}
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="rounded-[14px] border border-line px-4 py-3 text-[14px] text-muted">
            Row {i + 1}
          </div>
        ))}
      </div>
    </Screen>
  );
}

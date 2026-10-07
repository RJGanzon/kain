'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSheetDrag } from './gestures';

/**
 * Bottom sheet over the current screen. Opening it adds a history entry
 * (see nav.present), so Android Back closes it first. Drag the handle down
 * or tap the backdrop to close.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  /** `animate: false` when a drag already moved the sheet away. */
  onClose: (opts?: { animate?: boolean }) => void;
  children: ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => setHost(document.getElementById('app')), []);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [open, host]);

  const closeAfterDrag = useCallback(() => onCloseRef.current({ animate: false }), []);
  useSheetDrag(panelRef, { enabled: open && host !== null, onClose: closeAfterDrag });

  if (!open || !host) return null;
  return createPortal(
    <div className="sheet-root">
      <div className="sheet-scrim" aria-hidden="true" onClick={() => onClose()} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="sheet-panel">
        <div data-sheet-handle className="sheet-handle">
          <span className="sheet-grabber" aria-hidden="true" />
          <h2 id={titleId} className="text-[22px] font-extrabold tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>,
    host,
  );
}

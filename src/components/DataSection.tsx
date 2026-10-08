'use client';

import { Download, Smartphone, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { IconTile } from '@/components/ui/bits';
import { downloadBackup, restoreBackup } from '@/lib/data/backup';
import { useHydrated } from '@/lib/hydrated';

/** "1 purchase", "2 dishes" */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Settings → Your data: everything stays on this phone; save or restore a backup. */
export function DataSection() {
  const hydrated = useHydrated();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const [confirm, setConfirm] = useState<File | null>(null);
  if (!hydrated) return null;

  return (
    <section aria-labelledby="data-title" className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
      <div className="flex items-start gap-3">
        <IconTile size={40} radius={12} className="bg-surface">
          <Smartphone size={20} strokeWidth={2.2} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <h2 id="data-title" className="text-[15px] font-extrabold">
            Your data stays on this phone
          </h2>
          <p className="text-[13px] leading-[1.45] text-muted">
            No account needed. Save a backup to keep your plan, purchases and sales safe, or to move them to a new phone.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={async () => {
            const b = await downloadBackup();
            setNote({
              text: `Backup saved: ${count(b.logs.length, 'purchase', 'purchases')}, ${count(b.menu.length, 'dish', 'dishes')}, ${count(b.pots.length, 'pot', 'pots')}.`,
              good: true,
            });
          }}
          className="press flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-ink text-[14px] font-extrabold text-white"
        >
          <Download size={16} strokeWidth={2.4} aria-hidden="true" />
          Save a backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="press flex h-11 items-center justify-center gap-1.5 rounded-[14px] border border-line-strong bg-white text-[14px] font-extrabold text-ink"
        >
          <Upload size={16} strokeWidth={2.4} aria-hidden="true" />
          Restore
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        aria-label="Backup file to restore"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) setConfirm(file);
        }}
      />
      {confirm ? (
        <div className="flex items-center justify-between gap-3 rounded-[16px] bg-warn-bg px-3.5 py-2.5">
          <span className="text-[13px] leading-[1.4] font-bold text-warn">Replace what&apos;s on this phone with this backup?</span>
          <button
            type="button"
            onClick={async () => {
              const file = confirm;
              setConfirm(null);
              const res = await restoreBackup(file);
              setNote(
                res.ok
                  ? { text: `Restored ${count(res.logs, 'purchase', 'purchases')}, ${count(res.dishes, 'dish', 'dishes')} and ${count(res.pots, 'pot', 'pots')}.`, good: true }
                  : { text: res.message, good: false },
              );
            }}
            className="press h-10 flex-none rounded-[12px] bg-ink px-3.5 text-[14px] font-extrabold text-white"
          >
            Replace
          </button>
        </div>
      ) : null}
      {note ? (
        <p role="status" className={note.good ? 'text-[13px] font-semibold text-good' : 'text-[13px] font-semibold text-bad'}>
          {note.text}
        </p>
      ) : null}
    </section>
  );
}

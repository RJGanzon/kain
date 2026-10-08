'use client';

import { db, type MenuItem, type Pot, type PotSale, type PurchaseLog } from './db';

/**
 * Everything Kain keeps is on this phone, so people can save it to a file
 * (to keep it safe, or move it to a new phone) and restore it later.
 */

const SETTINGS_KEYS = ['kain:family', 'kain:market', 'kain:plan', 'kain:role', 'kain:shop-ticked'];

export interface Backup {
  app: 'kain';
  version: 1;
  exportedAt: string;
  settings: Record<string, unknown>;
  logs: PurchaseLog[];
  menu: MenuItem[];
  pots: Pot[];
  sales: PotSale[];
}

export async function makeBackup(): Promise<Backup> {
  const d = db();
  const settings: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) settings[key] = JSON.parse(raw);
    } catch {
      /* skip unreadable values */
    }
  }
  const [logs, menu, pots, sales] = d ? await Promise.all([d.logs.toArray(), d.menu.toArray(), d.pots.toArray(), d.sales.toArray()]) : [[], [], [], []];
  return { app: 'kain', version: 1, exportedAt: new Date().toISOString(), settings, logs, menu, pots, sales };
}

/** Save the backup as a file (kain-backup-2026-10-08.json). */
export async function downloadBackup(): Promise<Backup> {
  const backup = await makeBackup();
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kain-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return backup;
}

function isBackup(v: unknown): v is Backup {
  const b = v as Backup;
  return (
    !!b &&
    b.app === 'kain' &&
    b.version === 1 &&
    typeof b.settings === 'object' &&
    [b.logs, b.menu, b.pots, b.sales].every(Array.isArray)
  );
}

export type RestoreResult = { ok: true; logs: number; dishes: number; pots: number } | { ok: false; message: string };

/** Replace what's on this phone with a backup file's contents. */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, message: "That file isn't a Kain backup." };
  }
  if (!isBackup(data)) return { ok: false, message: "That file isn't a Kain backup." };
  const d = db();
  if (!d) return { ok: false, message: "This browser can't store data on the phone." };
  await d.transaction('rw', [d.logs, d.menu, d.pots, d.sales], async () => {
    await Promise.all([d.logs.clear(), d.menu.clear(), d.pots.clear(), d.sales.clear()]);
    await d.logs.bulkPut(data.logs);
    await d.menu.bulkPut(data.menu);
    await d.pots.bulkPut(data.pots);
    await d.sales.bulkPut(data.sales);
  });
  for (const key of SETTINGS_KEYS) {
    try {
      if (key in data.settings) localStorage.setItem(key, JSON.stringify(data.settings[key]));
      else localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('kain:device-state', { detail: key }));
    } catch {
      /* storage blocked */
    }
  }
  return { ok: true, logs: data.logs.length, dishes: data.menu.length, pots: data.pots.length };
}

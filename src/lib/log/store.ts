'use client';

import { db, type PurchaseLog } from '@/lib/data/db';
import { liveStore } from '@/lib/data/live';

/** This phone's purchase logs, newest first. */
const logs = liveStore<PurchaseLog[]>(async () => (await db()?.logs.orderBy('loggedAt').reverse().toArray()) ?? [], []);

/** Start loading logs early (app start), so the first screen that needs them has them. */
export const preloadLogs = logs.preload;

export const useLogs = logs.use;

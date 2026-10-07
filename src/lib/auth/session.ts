'use client';

import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * Who is signed in. Families can use Kain without an account; the session
 * matters for the eatery, the Business plan, and syncing to the server.
 */

export interface SessionState {
  /** False until Supabase has read the stored session (or there's no backend). */
  ready: boolean;
  session: Session | null;
}

const NONE: SessionState = { ready: false, session: null };
let state: SessionState = NONE;
const listeners = new Set<() => void>();
let started = false;

function set(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const sb = supabase();
  if (!sb) {
    set({ ready: true, session: null });
    return;
  }
  void sb.auth.getSession().then(({ data }) => set({ ready: true, session: data.session }));
  sb.auth.onAuthStateChange((_event, session) => set({ ready: true, session }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => NONE,
  );
}

export function currentSession(): Session | null {
  start();
  return state.session;
}

/** Resolves once the stored session has been read. */
export function sessionReady(): Promise<SessionState> {
  start();
  if (state.ready) return Promise.resolve(state);
  return new Promise((resolve) => {
    const l = () => {
      if (state.ready) {
        listeners.delete(l);
        resolve(state);
      }
    };
    listeners.add(l);
  });
}

export function onSessionChange(listener: (s: SessionState) => void): () => void {
  const l = () => listener(state);
  listeners.add(l);
  start();
  return () => listeners.delete(l);
}

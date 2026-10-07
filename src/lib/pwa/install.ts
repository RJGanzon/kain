'use client';

import { useSyncExternalStore } from 'react';

/**
 * "Install Kain": keeps the browser's install prompt (Android/Chrome) for a
 * button, or tells iPhone users how to add Kain to the home screen.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = 'prompt' | 'ios' | null;

const DISMISS_KEY = 'kain:install-dismissed';
let deferred: InstallPromptEvent | null = null;
let installed = false;
let dismissed = false;
let wired = false;
const listeners = new Set<() => void>();
let snapshot: Mode = null;

function standalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function compute(): Mode {
  if (installed || dismissed || standalone()) return null;
  if (deferred) return 'prompt';
  if (isIOSSafari()) return 'ios';
  return null;
}

function notify() {
  snapshot = compute();
  listeners.forEach((l) => l());
}

/** Listen for the install prompt from app start. */
export function captureInstallPrompt(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) !== null;
  } catch {
    /* storage blocked */
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
  notify();
}

export function useInstallMode(): Mode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      captureInstallPrompt();
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => null,
  );
}

export async function install(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome === 'accepted';
}

export function dismissInstall(): void {
  dismissed = true;
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
  notify();
}

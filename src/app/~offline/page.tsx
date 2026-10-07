import type { Metadata } from 'next';
import { OfflineScreen } from '@/components/screens/OfflineScreen';

export const metadata: Metadata = { title: 'Offline' };

/** Shown for a screen that hasn't been opened on this phone yet, while offline. */
export default function OfflinePage() {
  return <OfflineScreen />;
}

import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AuthCallbackScreen } from '@/components/screens/AuthCallbackScreen';

export const metadata: Metadata = { title: 'Signing in' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackScreen />
    </Suspense>
  );
}

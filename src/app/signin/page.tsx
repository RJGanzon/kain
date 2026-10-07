import type { Metadata, Viewport } from 'next';
import { SignInScreen } from '@/components/screens/SignInScreen';

export const metadata: Metadata = { title: 'Sign in' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function SignInPage() {
  return <SignInScreen />;
}

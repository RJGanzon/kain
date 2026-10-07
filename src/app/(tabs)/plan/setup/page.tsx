import type { Metadata } from 'next';
import { SetupScreen } from '@/components/screens/SetupScreen';

export const metadata: Metadata = { title: 'Your plan' };

export default function SetupPage() {
  return <SetupScreen />;
}

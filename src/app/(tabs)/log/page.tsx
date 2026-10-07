import type { Metadata } from 'next';
import { LogScreen } from '@/components/screens/LogScreen';

export const metadata: Metadata = { title: 'Log a purchase' };

export default function LogPage() {
  return <LogScreen />;
}

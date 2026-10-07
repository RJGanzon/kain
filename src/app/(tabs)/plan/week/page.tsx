import type { Metadata } from 'next';
import { WeekScreen } from '@/components/screens/WeekScreen';

export const metadata: Metadata = { title: 'This week' };

export default function WeekPage() {
  return <WeekScreen />;
}

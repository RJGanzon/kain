import type { Metadata } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: 'This week' };

export default function WeekPage() {
  return <Placeholder title="This week" presentation="stack" back={{ fallback: '/plan', kind: 'pop' }} />;
}

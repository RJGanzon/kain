import type { Metadata } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: 'Log a purchase' };

export default function LogPage() {
  return <Placeholder title="Log a purchase" presentation="tab" scrollKey="/log" />;
}

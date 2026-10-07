import type { Metadata } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: 'Your plan' };

export default function SetupPage() {
  return <Placeholder title="Your plan" presentation="stack-full" back={{ fallback: '/plan', kind: 'pop-full' }} />;
}

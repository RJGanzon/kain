import type { Metadata, Viewport } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: 'Business plan' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function BusinessPage() {
  return <Placeholder title="Business plan" presentation="sheet" back={{ fallback: '/eatery', kind: 'sheet-down' }} />;
}

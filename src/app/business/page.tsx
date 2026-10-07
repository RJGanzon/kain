import type { Metadata, Viewport } from 'next';
import { BusinessScreen } from '@/components/screens/BusinessScreen';

export const metadata: Metadata = { title: 'Business plan' };
export const viewport: Viewport = { themeColor: '#FFC83A' };

export default function BusinessPage() {
  return <BusinessScreen />;
}

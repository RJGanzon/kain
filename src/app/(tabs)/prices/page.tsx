import type { Metadata } from 'next';
import { PricesScreen } from '@/components/screens/PricesScreen';

export const metadata: Metadata = { title: "Today's prices" };

export default function PricesPage() {
  return <PricesScreen />;
}

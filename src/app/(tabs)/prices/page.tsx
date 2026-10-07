import type { Metadata } from 'next';
import { Placeholder } from '@/components/screens/Placeholder';

export const metadata: Metadata = { title: "Today's prices" };

export default function PricesPage() {
  return <Placeholder title="Today's prices" presentation="tab" scrollKey="/prices" />;
}

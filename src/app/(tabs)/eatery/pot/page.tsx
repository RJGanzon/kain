import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PotScreen } from '@/components/screens/PotScreen';

export const metadata: Metadata = { title: 'Pot' };

/** /eatery/pot?id=… — pots are made on the phone, so the id is read there. */
export default function PotPage() {
  return (
    <Suspense fallback={null}>
      <PotScreen />
    </Suspense>
  );
}

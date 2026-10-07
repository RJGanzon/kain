import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Placeholder } from '@/components/screens/Placeholder';
import { SAMPLE_DISHES, sampleDish } from '@/lib/sample/eatery';

export const dynamicParams = false;

export function generateStaticParams() {
  return SAMPLE_DISHES.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: sampleDish(id)?.name ?? 'Pot' };
}

export default async function PotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dish = sampleDish(id);
  if (!dish) notFound();
  return <Placeholder title={dish.name} presentation="stack-full" back={{ fallback: '/eatery', kind: 'pop-full' }} />;
}

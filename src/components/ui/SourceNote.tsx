'use client';

import { isStale, pricesAsOf } from '@/lib/data/catalog';
import type { Catalog } from '@/lib/data/types';
import { SampleBadge } from './Pill';
import { shortDate } from './PriceLabels';

/**
 * Says how far to trust the prices on a screen: "Sample data" for the
 * bundled estimates, "Prices from Oct 5" when they couldn't be refreshed
 * for over 6 hours, nothing when they're fresh.
 */
export function SourceNote({ catalog }: { catalog: Catalog }) {
  if (catalog.sample) return <SampleBadge />;
  if (isStale(catalog)) {
    const asOf = pricesAsOf(catalog);
    return asOf ? <span className="text-[12px] font-bold whitespace-nowrap text-warn">Prices from {shortDate(asOf)}</span> : null;
  }
  return null;
}

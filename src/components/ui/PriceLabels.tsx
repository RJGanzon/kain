import type { Tier } from '@/lib/data/types';
import { Pill, type PillTone } from './Pill';

export const TIER_LABEL: Record<Tier, string> = {
  contributor: 'Contributor',
  user_log: 'Your log',
  da_market: 'DA market',
  da_avg: 'DA average',
  estimate: 'Estimate',
};

const TIER_TONE: Record<Tier, PillTone> = {
  contributor: 'tier-contributor',
  user_log: 'tier-log',
  da_market: 'tier-da',
  da_avg: 'tier-avg',
  estimate: 'tier-est',
};

/** Where a price came from: Contributor, Your log, DA market, DA average, Estimate. */
export function TierPill({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <Pill tone={TIER_TONE[tier]} className={className ?? 'px-[7px] py-px font-bold'}>
      {TIER_LABEL[tier]}
    </Pill>
  );
}

/** 4-week change: under 3% steady; ▲ 15% or more bad, ▲ under 15% warn; ▼ good. */
export function changeOf(price: number, prev: number | null): { text: string; tone: PillTone; ratio: number } | null {
  if (prev === null || prev <= 0) return null;
  const ch = (price - prev) / prev;
  if (Math.abs(ch) < 0.03) return { text: 'steady', tone: 'steady', ratio: ch };
  const pct = Math.round(Math.abs(ch) * 100);
  if (ch > 0) return { text: `▲ ${pct}%`, tone: ch >= 0.15 ? 'bad' : 'warn', ratio: ch };
  return { text: `▼ ${pct}%`, tone: 'good', ratio: ch };
}

/** "Oct 5", or "Today". Dates are yyyy-mm-dd in Philippine time. */
export function shortDate(iso: string, today: string = manilaToday()): string {
  if (iso === today) return 'Today';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Today's date in the Philippines, yyyy-mm-dd. */
export function manilaToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

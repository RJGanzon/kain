/**
 * SAMPLE plan for ₱350 a day, 2 adults and 3 kids, 7 days, generated from
 * the reference MVP by scripts/gen-sample.mjs. Shown with a "Sample data"
 * label until Phase 4 runs the real planner on the phone.
 */
import data from './plan.json';
import pricesData from './prices.json';

export type MealSlot = 'almusal' | 'tanghalian' | 'hapunan';

export interface SampleMeal {
  id: string;
  name: string;
  ingredients: string;
  cost: number;
}

export interface SampleDay {
  cost: number;
  over: boolean;
  animalDay: boolean;
  score: number;
  coverage: number[];
  meals: Record<MealSlot, SampleMeal>;
}

export interface SampleShopItem {
  id: string;
  name: string;
  category: string;
  qty: string;
  leftOver: number;
  cost: number;
  tier: string;
}

export const SAMPLE_PLAN = data as {
  inputs: { budget: number; adults: number; kids: number; days: number };
  servings: number;
  weekCost: number;
  budgetTotal: number;
  shopTotal: number;
  nutrients: string[];
  average: number[];
  days: SampleDay[];
  shop: SampleShopItem[];
};

/** The design's sample week starts on Tuesday, October 6. */
export const SAMPLE_WEEKDAYS = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
export const SAMPLE_TODAY_LABEL = 'Tuesday, October 6';

/** Weighted share of daily needs met (energy and protein count 1.5×). */
export function nutritionScore(coverage: number[]): number {
  const weights = [1.5, 1.5, 1, 1, 1, 1];
  const sum = weights.reduce((a, w) => a + w, 0);
  return coverage.reduce((a, v, k) => a + weights[k] * Math.min(v, 1), 0) / sum;
}

export type Tier = 'contrib' | 'log' | 'da_market' | 'da_avg' | 'estimate';

export interface SamplePrice {
  id: string;
  name: string;
  aliases: string[];
  filter: 'Fish' | 'Meat' | 'Vegetables' | 'Pantry';
  tier: Tier;
  date: string;
  price: number;
  unit: string;
  change: number;
}

export const SAMPLE_PRICES = pricesData.prices as SamplePrice[];

export const TIER_LABEL: Record<Tier, string> = {
  contrib: 'Contributor',
  log: 'Your log',
  da_market: 'DA market',
  da_avg: 'DA average',
  estimate: 'Estimate',
};

export const SAMPLE_MARKETS = [
  { id: 'pampang', name: 'Pampang Market', city: 'Angeles City' },
  { id: 'san-nicolas', name: 'San Nicolas Market', city: 'Angeles City' },
  { id: 'anunas', name: 'Anunas Market', city: 'Angeles City' },
];

/** Example purchase log entries (the MVP's EXAMPLE_LOGS). */
export const SAMPLE_LOGS = [
  { id: 'l3', name: 'Kangkong', qty: '2 tali', when: 'Today', unit: '₱20 per tali', price: 40, status: 'added' as const },
  { id: 'l2', name: 'Itlog', qty: '12 pcs', when: 'Yesterday', unit: '₱8.50 each', price: 102, status: 'added' as const },
  { id: 'l1', name: 'Bangus', qty: '1 kg', when: 'Oct 4', unit: '₱240 per kg', price: 240, status: 'added' as const },
];

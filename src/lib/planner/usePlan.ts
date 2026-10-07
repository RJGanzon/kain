'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from '@/lib/data/catalog';
import type { Catalog, Price } from '@/lib/data/types';
import { useHydrated } from '@/lib/hydrated';
import { usePrices } from '@/lib/log/prices';
import { useFamily, type FamilySettings } from '@/lib/store/device';
import { planWithinBudget, type Plan, type PlanCatalog, type PlanInput } from './planner';

/**
 * Plans are made in a Web Worker and remembered per input, so screens that
 * show the same plan (Today, Week, Log) share one result, and Set budget
 * can build the new plan before going back to Today.
 */

const cache = new Map<string, Plan>();
const MAX_CACHED = 12;

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const waiting = new Map<number, { resolve: (p: Plan) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./planner.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
    worker.onmessage = (e: MessageEvent<{ id: number; plan?: Plan; error?: string }>) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      waiting.delete(e.data.id);
      if (e.data.plan) w.resolve(e.data.plan);
      else w.reject(new Error(e.data.error ?? 'Planner failed'));
    };
    worker.onerror = () => {
      // A broken worker: answer everyone on the main thread from now on.
      worker?.terminate();
      worker = null;
      workerBroken = true;
      for (const [, w] of waiting) w.reject(new Error('worker failed'));
      waiting.clear();
    };
  }
  return worker;
}

export function toPlanInput(f: FamilySettings): PlanInput {
  return { budget: f.budget, adults: f.adults, kids: f.kids, days: f.days };
}

function priceSignature(prices: Record<string, Price>): string {
  return Object.keys(prices)
    .sort()
    .map((id) => `${id}:${prices[id].price}`)
    .join(',');
}

export function planKey(catalog: Pick<Catalog, 'marketId' | 'recipes'>, prices: Record<string, Price>, input: PlanInput): string {
  return `${input.budget}|${input.adults}|${input.kids}|${input.days}|${catalog.marketId}|${catalog.recipes.length}|${priceSignature(prices)}`;
}

function remember(key: string, plan: Plan) {
  cache.set(key, plan);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
}

/** Make (or recall) the plan for these inputs. */
export function computePlan(catalog: PlanCatalog, key: string, input: PlanInput): Promise<Plan> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const w = workerBroken ? null : getWorker();
  const run = w
    ? new Promise<Plan>((resolve, reject) => {
        const id = ++seq;
        waiting.set(id, { resolve, reject });
        w.postMessage({ id, catalog, input });
      }).catch(() => planWithinBudget(catalog, input))
    : Promise.resolve().then(() => planWithinBudget(catalog, input));
  return run.then((plan) => {
    remember(key, plan);
    return plan;
  });
}

export interface PlanState {
  plan: Plan;
  /** Inputs changed and the new plan is still being made. */
  pending: boolean;
  catalog: Catalog;
  prices: Record<string, Price>;
  family: FamilySettings;
}

/** The plan for this phone's family settings and market, or null until it's ready. */
export function usePlan(): PlanState | null {
  const hydrated = useHydrated();
  const catalog = useCatalog();
  const prices = usePrices(catalog);
  const [family] = useFamily();
  const input = useMemo(() => toPlanInput(family), [family]);
  const key = useMemo(() => planKey(catalog, prices, input), [catalog, prices, input]);
  const [state, setState] = useState<{ key: string; plan: Plan } | null>(() => {
    const hit = cache.get(key);
    return hit ? { key, plan: hit } : null;
  });

  useEffect(() => {
    if (!hydrated || state?.key === key) return;
    const hit = cache.get(key);
    if (hit) {
      setState({ key, plan: hit });
      return;
    }
    let live = true;
    void computePlan({ ingredients: catalog.ingredients, recipes: catalog.recipes, prices }, key, input).then((plan) => {
      if (live) setState({ key, plan });
    });
    return () => {
      live = false;
    };
  }, [hydrated, key, state?.key, catalog, prices, input]);

  if (!hydrated || !state) return null;
  return { plan: state.plan, pending: state.key !== key, catalog, prices, family };
}

/** Build the plan for new settings ahead of showing it (Set budget → Today). */
export function prepareFamilyPlan(catalog: Catalog, prices: Record<string, Price>, family: FamilySettings): Promise<Plan> {
  const input = toPlanInput(family);
  return computePlan({ ingredients: catalog.ingredients, recipes: catalog.recipes, prices }, planKey(catalog, prices, input), input);
}

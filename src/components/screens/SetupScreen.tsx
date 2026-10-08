'use client';

import { ArrowRight } from 'lucide-react';
import { DataSection } from '@/components/DataSection';
import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Stepper } from '@/components/ui/Stepper';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/data/catalog';
import { usePrices } from '@/lib/log/prices';
import { BackButton } from '@/lib/nav/links';
import { nav } from '@/lib/nav/nav';
import { Screen } from '@/lib/nav/Screen';
import { prepareFamilyPlan } from '@/lib/planner/usePlan';
import { useFamily, type FamilySettings } from '@/lib/store/device';

const MIN = 150;
const MAX = 800;
const QUICK = [250, 350, 500];

export function SetupScreen() {
  const [saved, save] = useFamily();
  const catalog = useCatalog();
  const prices = usePrices(catalog);
  const [draft, setDraft] = useState<FamilySettings | null>(null);
  const [building, setBuilding] = useState(false);
  const f = draft ?? saved;
  const set = (patch: Partial<FamilySettings>) => setDraft({ ...f, ...patch });
  const fill = ((Math.min(MAX, Math.max(MIN, f.budget)) - MIN) / (MAX - MIN)) * 100;
  const servings = (f.adults + 0.6 * f.kids).toFixed(1);

  // Make the new plan first, so Today slides back in already showing it.
  const build = async () => {
    if (building) return;
    setBuilding(true);
    try {
      await prepareFamilyPlan(catalog, prices, f);
    } catch {
      /* Today will make it */
    }
    save(f);
    nav.back('/plan', 'pop-full');
    setBuilding(false);
  };

  return (
    <Screen
      presentation="stack-full"
      label="Your plan"
      backFallback="/plan"
      footer={
        <div className="flex flex-col items-center gap-2.5">
          <Button onClick={build} aria-busy={building}>
            {building ? 'Building your plan…' : 'Build my plan'}
            <ArrowRight size={18} strokeWidth={2.6} className="text-brand" aria-hidden="true" />
          </Button>
          <div className="text-[12px] font-semibold text-muted">{servings} servings per meal · same inputs, same plan</div>
        </div>
      }
    >
      <div className="flex flex-col gap-[22px] px-5 pt-4 pb-4">
        <header className="flex h-11 items-center justify-between">
          <BackButton fallback="/plan" kind="pop-full" />
          <div className="text-[15px] font-extrabold">Your plan</div>
          <div className="w-11" />
        </header>

        <h1 id="budget-q" className="text-[26px] leading-[1.2] font-extrabold tracking-[-0.02em]">
          How much can you spend on food each day?
        </h1>

        <div className="flex flex-col gap-4 rounded-[24px] bg-surface px-5 py-[22px]">
          <div className="flex flex-col items-center gap-0.5">
            <output htmlFor="budget-range" className="text-[56px] leading-none font-extrabold tracking-[-0.04em]">
              ₱{f.budget}
            </output>
            <div className="text-[13px] font-semibold text-muted">per day for the whole family</div>
          </div>
          <input
            id="budget-range"
            type="range"
            min={MIN}
            max={MAX}
            step={10}
            value={f.budget}
            aria-labelledby="budget-q"
            aria-valuetext={`₱${f.budget} a day`}
            onChange={(e) => set({ budget: Number(e.target.value) })}
            className="range"
            style={{ '--fill': `${fill}%` } as CSSProperties}
          />
          <div className="flex justify-center gap-2">
            {QUICK.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={f.budget === v}
                onClick={() => set({ budget: v })}
                className={cn(
                  'press hit h-10 rounded-full border border-track-strong px-4 text-[14px] font-bold text-ink',
                  f.budget === v ? 'bg-brand' : 'bg-white',
                )}
              >
                ₱{v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[13px] font-bold tracking-[0.02em] text-muted">Who&apos;s eating</div>
          <Stepper label="Adults and teens" sub="1 serving each" noun="adults" value={f.adults} min={1} max={10} onChange={(adults) => set({ adults })} />
          <div className="h-px bg-line" />
          <Stepper label="Kids, 4 to 12" sub="0.6 serving each" noun="kids" value={f.kids} min={0} max={10} onChange={(kids) => set({ kids })} />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-[13px] font-bold tracking-[0.02em] text-muted">Plan for</div>
          <Segmented
            label="Plan for"
            height={40}
            value={f.days === 1 ? 'today' : 'week'}
            onChange={(v) => set({ days: v === 'today' ? 1 : 7 })}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: '7 days' },
            ]}
          />
        </div>

        <DataSection />
      </div>
    </Screen>
  );
}

'use client';

import { Apple, Check, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { IconTile } from '@/components/ui/bits';
import { Meter } from '@/components/ui/Meter';
import { Pill, SampleBadge } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { peso } from '@/lib/format';
import { Screen } from '@/lib/nav/Screen';
import { runTransition } from '@/lib/nav/transition';
import { usePlan } from '@/lib/planner/usePlan';
import { SAMPLE_LOGS } from '@/lib/sample/logs';

const EXAMPLE = 'isang kilo kamatis 110';

/**
 * Log a purchase. Phase 2 shows the parsed preview for the example entry
 * only; Phase 5 adds the parser, voice input and price feedback.
 */
export function LogScreen() {
  const [text, setText] = useState(EXAMPLE);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState<boolean | null>(null);
  const [entries, setEntries] = useState(SAMPLE_LOGS);

  useEffect(() => {
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setVoice(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  const logged = entries.reduce((a, e) => a + e.price, 0);
  const planState = usePlan();
  // The plan's shopping for a week (a one-day plan counts seven times).
  const plan = planState ? Math.round((planState.plan.shopTotal / planState.plan.days.length) * 7) : 0;
  const showPreview = text.trim().toLowerCase() === EXAMPLE;

  const add = () => {
    if (!showPreview) return;
    void runTransition('fade', () =>
      flushSync(() => {
        setEntries((list) => [
          { id: `l${Date.now()}`, name: 'Kamatis', qty: '1 kg', when: 'Today', unit: '₱110 per kg', price: 110, status: 'added' as const },
          ...list,
        ]);
        setText('');
      }),
    );
  };

  return (
    <Screen presentation="tab" label="Log a purchase" scrollKey="/log">
      <div className="flex flex-col gap-4 px-5 pt-6 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Log a purchase</h1>
          <p className="text-[14px] leading-[1.4] text-muted">Say it or type it. Each entry adds a dated price for your market.</p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[24px] bg-surface p-5">
          {voice !== false ? (
            <button
              type="button"
              aria-label={listening ? 'Stop listening' : 'Speak your purchase'}
              aria-pressed={listening}
              onClick={() => setListening((l) => !l)}
              className={cn(
                'press flex size-24 items-center justify-center rounded-full bg-brand text-ink',
                listening ? 'mic-listening' : 'shadow-float',
              )}
            >
              <Mic size={36} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
          <div className="text-center text-[14px] font-bold" aria-live="polite">
            {voice === false
              ? 'Voice works in Chrome on Android. Typing works everywhere.'
              : listening
                ? 'Listening… say item, amount and price'
                : 'Tap and say “isang kilo kamatis 110”'}
          </div>
          <form
            className="flex h-12 w-full items-center gap-2 rounded-[14px] bg-white pr-1.5 pl-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label htmlFor="logText" className="sr-only">
              What you bought
            </label>
            <input
              id="logText"
              value={text}
              autoComplete="off"
              onChange={(e) => setText(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none"
            />
            <button type="submit" className="press hit h-9 rounded-[10px] bg-ink px-3.5 text-[14px] font-extrabold text-white">
              Add
            </button>
          </form>
        </div>

        {showPreview ? (
          <div className="flex flex-col gap-2 rounded-[20px] border border-line px-4 py-3.5">
            <div className="flex items-center gap-3">
              <IconTile size={40} radius={12} className="bg-bad-bg">
                <Apple size={20} strokeWidth={2.2} className="text-bad-icon" />
              </IconTile>
              <div className="flex-1">
                <div className="text-[15px] font-extrabold">Kamatis · 1 kg</div>
                <div className="text-[13px] text-muted">₱110 per kg · market price ₱120</div>
              </div>
              <div className="text-[17px] font-extrabold">₱110</div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-good">
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              Close to market price. It will update Pampang&apos;s kamatis price.
            </div>
          </div>
        ) : null}

        <section aria-labelledby="week-title" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="week-title" className="text-[17px] font-extrabold">
              This week
            </h2>
            <div className="text-[12px] font-semibold text-muted">{peso(Math.max(0, plan - logged))} not logged yet</div>
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2.5">
            <span className="text-[13px] font-bold">Plan</span>
            <Meter value={1} height={10} fillClassName="bg-brand" label={`Plan ${peso(plan)}`} />
            <span className="text-right text-[13px] font-extrabold">{peso(plan)}</span>
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2.5">
            <span className="text-[13px] font-bold">Logged</span>
            <Meter value={plan ? logged / plan : 0} height={10} label={`Logged ${peso(logged)}`} />
            <span className="text-right text-[13px] font-extrabold">{peso(logged)}</span>
          </div>
        </section>

        <section aria-labelledby="recent-title" className="flex flex-col">
          <div className="flex items-center justify-between pb-0.5">
            <h2 id="recent-title" className="text-[17px] font-extrabold">
              Recent
            </h2>
            <SampleBadge />
          </div>
          {entries.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-line py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">
                  {r.name} · {r.qty}
                </div>
                <div className="text-[12px] text-muted">
                  {r.when} · {r.unit}
                </div>
              </div>
              <Pill tone="good" className="py-[3px]">
                Price added
              </Pill>
              <div className="w-12 text-right text-[15px] font-extrabold">{peso(r.price)}</div>
            </div>
          ))}
        </section>
      </div>
    </Screen>
  );
}

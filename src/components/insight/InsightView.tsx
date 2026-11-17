'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';

import TopBar from '@/components/TopBar';
import { useUid } from '@/components/AuthGate';
import CustomPicker from '@/components/insight/CustomPicker';
import History, { PastDay } from '@/components/insight/History';
import Lessons from '@/components/insight/Lessons';
import MeaningSearch from '@/components/insight/MeaningSearch';
import ThemeOverTime from '@/components/insight/ThemeOverTime';
import YearSummary from '@/components/insight/YearSummary';
import RangeAnalysis from '@/components/insight/RangeAnalysis';
import { useAnalyses } from '@/hooks/useInsight';
import { clockStore } from '@/lib/clock';
import { dayOf, isDayId } from '@/lib/day';
import { PRESETS, rangeLabel, splitRange } from '@/lib/ranges';
import type { Range } from '@/types/hodi';

// ============================================================
// hodi - Insight: every AI feature in one page (PLAN-ai A8)
//
// Analyze a range of days (with a short talk on each), search by meaning,
// the kept lessons and the history. Analyses live for one day: tomorrow the
// page starts empty, and today's ones move to the history (read-only).
// Today stays a plain writing page.
// ============================================================

export default function InsightView() {
  const uid = useUid();
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);
  const [range, setRange] = useState<Range>('today');
  const analyses = useAnalyses(uid);
  const past = useSearchParams().get('d');
  // The custom chip shows the last custom range used today (or the one just set).
  const [custom, setCustom] = useState<Range | null>(null);
  const [picking, setPicking] = useState(false);
  const todayCustom = analyses.filter((a) => a.day === today && splitRange(a.range) && !PRESETS.includes(a.range as never)).at(-1)?.range;
  const customRange = custom ?? todayCustom ?? null;

  if (isDayId(past) && past !== today) return <PastDay uid={uid} day={past} analyses={analyses} />;

  return (
    <main className="paper pb-24">
      <TopBar current="insight" left="insight" />

      <div className="mt-10 flex gap-4 text-[15px]" role="radiogroup" aria-label="Range">
        {PRESETS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={r === range}
            onClick={() => {
              setRange(r);
              setPicking(false);
            }}
            className={r === range ? 'text-ink' : 'text-faint hover:text-muted'}
          >
            {rangeLabel(r)}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={range === customRange}
          onClick={() => {
            if (customRange && range !== customRange) setRange(customRange);
            else setPicking((p) => !p);
          }}
          className={customRange && range === customRange ? 'text-ink' : 'text-faint hover:text-muted'}
        >
          {customRange ? rangeLabel(customRange) : 'custom'}
        </button>
      </div>
      {picking && (
        <CustomPicker
          initial={customRange}
          onSet={(r) => {
            setCustom(r);
            setRange(r);
            setPicking(false);
          }}
        />
      )}

      <RangeAnalysis
        key={range}
        uid={uid}
        today={today}
        range={range}
        latest={analyses.filter((a) => a.range === range && a.day === today).at(-1)}
      />

      <MeaningSearch />

      <ThemeOverTime />

      <YearSummary uid={uid} />

      <Lessons uid={uid} />

      <History analyses={analyses} today={today} />
    </main>
  );
}

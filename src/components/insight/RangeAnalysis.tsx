'use client';

import { useState } from 'react';

import AnalysisView from '@/components/insight/AnalysisView';
import { label, link } from '@/components/insight/styles';
import { useJournal } from '@/contexts/JournalContext';
import { analyzeRange, failWord } from '@/lib/ai';
import type { Analysis, Range } from '@/types/hodi';

export default function RangeAnalysis({
  uid,
  today,
  range,
  latest,
}: {
  uid: string;
  today: string;
  range: Range;
  latest: Analysis | undefined;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed' | 'empty'>('idle');
  const [failText, setFailText] = useState('failed');
  // The analysis on screen when "analyze" was pressed. A different one arriving
  // after that is new in this visit and fades in; one saved earlier shows at once.
  const [ran, setRan] = useState<{ before: string | undefined } | null>(null);
  const fresh = ran !== null && latest !== undefined && latest.id !== ran.before;
  const run = async () => {
    setRan({ before: latest?.id });
    setState('busy');
    try {
      await analyzeRange(today, range);
      setState('idle');
    } catch (err) {
      console.warn('[ai] analyze failed', err);
      const code = (err as { code?: string }).code ?? '';
      setFailText(failWord(err));
      setState(code.endsWith('failed-precondition') ? 'empty' : 'failed');
    }
  };
  // Writing after the analysis (in its range) makes it out of date.
  const { entries } = useJournal();
  const outdated =
    !!latest && entries.some((e) => e.date >= latest.from && e.date <= latest.to && e.updatedAt > latest.createdAt);

  return (
    <section className="mt-8">
      <p className="flex items-baseline gap-3">
        {state === 'busy' ? (
          <span className={`${label} breathe`}>reading…</span>
        ) : (
          <button type="button" onClick={run} className={link}>
            {latest ? 'analyze again' : 'analyze'}
          </button>
        )}
        {state === 'failed' && <span className={label}>{failText}</span>}
        {state === 'empty' && <span className={label}>no pages in this range</span>}
        {latest && outdated && state !== 'busy' && <span className={label}>new writing since</span>}
      </p>
      {latest && <AnalysisView key={latest.id} uid={uid} a={latest} live fade={fresh} />}
    </section>
  );
}

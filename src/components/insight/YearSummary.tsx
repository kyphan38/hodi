'use client';

import { useEffect, useMemo, useState } from 'react';

import { label, link } from '@/components/insight/styles';
import { useJournal } from '@/contexts/JournalContext';
import { failWord, yearSummary } from '@/lib/ai';
import { bookYears } from '@/lib/book';
import { watchYearSum } from '@/lib/insight-data';

/** H4: AI looks back on a whole year from the month summaries. The latest one is kept per year. */
export default function YearSummary({ uid }: { uid: string }) {
  const { entries } = useJournal();
  const years = useMemo(() => bookYears(entries), [entries]);
  const [picked, setPicked] = useState<string | null>(null);
  const year = picked ?? years[0] ?? null;
  const [saved, setSaved] = useState<{ year: string; text: string } | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [failText, setFailText] = useState('failed');

  useEffect(() => {
    if (!year) return;
    return watchYearSum(uid, year, (t) => setSaved(t === null ? null : { year, text: t }));
  }, [uid, year]);

  if (!year) return null;
  const text = saved?.year === year ? saved.text : '';

  const run = async () => {
    setState('busy');
    try {
      await yearSummary(year);
      setState('idle');
    } catch (err) {
      console.warn('[ai] year failed', err);
      setFailText(failWord(err));
      setState('failed');
    }
  };

  return (
    <section className="mt-16">
      <p className={label}>the year</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px]">
        {years.map((y) => (
          <button key={y} type="button" onClick={() => setPicked(y)} className={y === year ? 'text-ink' : 'text-faint hover:text-muted'}>
            {y}
          </button>
        ))}
        {state === 'busy' ? (
          <span className={`${label} breathe`}>reading the year…</span>
        ) : (
          <button type="button" onClick={() => void run()} className={link}>
            {text ? 'summarize again' : 'summarize the year'}
          </button>
        )}
        {state === 'failed' && <span className={label}>{failText}</span>}
      </div>
      {text && <p className="fade-in mt-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{text}</p>}
    </section>
  );
}

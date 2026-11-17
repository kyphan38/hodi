'use client';

import Link from 'next/link';
import { useState } from 'react';

import { label } from '@/components/insight/styles';
import { failWord, themeOverTime, type ThemeHit } from '@/lib/ai';
import { dayShort, dayTiny } from '@/lib/day';

type Result = { summary: string; hits: ThemeHit[]; partial: boolean };

/** H8: one theme across the journal, oldest first, with a short note on how it changed. Not saved. */
export default function ThemeOverTime() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'failed' | Result>('idle');
  const [failText, setFailText] = useState('failed');
  const run = async () => {
    const text = q.trim();
    if (text.length < 2) return;
    setState('busy');
    try {
      setState(await themeOverTime(text));
    } catch (err) {
      console.warn('[ai] theme failed', err);
      setFailText(failWord(err));
      setState('failed');
    }
  };
  return (
    <section className="mt-16">
      <p className={label}>a theme over time</p>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="work, my mother, money"
          aria-label="A theme over time"
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="go"
          className="w-full appearance-none border-b border-line bg-transparent pb-2 text-base placeholder:text-faint focus:border-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>
      {state === 'busy' && <p className={`${label} breathe mt-4`}>reading…</p>}
      {state === 'failed' && <p className={`${label} mt-4`}>{failText}</p>}
      {typeof state === 'object' && (
        <div className="fade-in">
          {state.partial && <p className="mt-4 text-[13px] text-faint">Still reading older pages. Ask again in a minute for more.</p>}
          {state.hits.length === 0 ? (
            <p className="mt-4 text-faint">Nothing about this yet.</p>
          ) : (
            <>
              {state.summary && <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{state.summary}</p>}
              <ol className="mt-4">
                {state.hits.map((h) => (
                  <li key={`${h.day}-${h.time}-${h.text.slice(0, 20)}`}>
                    <Link href={`/day/?d=${h.day}`} className="group block py-3">
                      <span className={label}>
                        {dayShort(h.day)} {dayTiny(h.day).split(' ')[1]} {h.day.slice(0, 4)}
                        {h.time ? ` · ${h.time}` : ''}
                      </span>
                      <span className="mt-1 line-clamp-3 block text-[15px] leading-relaxed text-muted group-hover:text-ink">{h.text}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';

import { label } from '@/components/insight/styles';
import { searchByMeaning, type MeaningHit } from '@/lib/ai';
import { dayShort, dayTiny } from '@/lib/day';

export default function MeaningSearch() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'failed' | { hits: MeaningHit[]; partial: boolean }>('idle');
  // Counts the searches that came back, so each result block fades in on its own.
  const [answers, setAnswers] = useState(0);
  const run = async () => {
    const text = q.trim();
    if (!text) return;
    setState('busy');
    try {
      const found = await searchByMeaning(text);
      setAnswers((n) => n + 1);
      setState(found);
    } catch (err) {
      console.warn('[ai] search failed', err);
      setState('failed');
    }
  };
  return (
    <section className="mt-16">
      <p className={label}>search by meaning</p>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="worried about work"
          aria-label="Search by meaning"
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="search"
          className="w-full appearance-none border-b border-line bg-transparent pb-2 text-base placeholder:text-faint focus:border-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>
      {state === 'busy' && <p className={`${label} breathe mt-4`}>searching…</p>}
      {state === 'failed' && <p className={`${label} mt-4`}>failed</p>}
      {typeof state === 'object' && (
        <div key={answers} className="fade-in">
          {state.partial && (
            <p className="mt-4 text-[13px] text-faint">
              Still reading older pages.{' '}
              <button type="button" onClick={run} className="font-medium text-ink">
                Search again
              </button>
            </p>
          )}
          {state.hits.length === 0 ? (
            <p className="mt-4 text-faint">Nothing close.</p>
          ) : (
            <ul className="mt-4">
              {state.hits.map((h) => (
                <li key={`${h.day}-${h.time}-${h.text.slice(0, 20)}`}>
                  <Link href={`/day/?d=${h.day}`} className="group block py-3">
                    <span className={label}>
                      {dayShort(h.day)} {dayTiny(h.day).split(' ')[1]} {h.day.slice(0, 4)}
                      {h.time ? ` · ${h.time}` : ''}
                    </span>
                    <span className="mt-1 line-clamp-3 block text-[15px] leading-relaxed text-muted group-hover:text-ink">
                      {h.text}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

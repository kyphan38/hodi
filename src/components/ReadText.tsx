'use client';

import { Fragment, useEffect, useRef, type ReactNode } from 'react';

import { isMarkLine } from '@/lib/day';
import { findMatches, queryTerms } from '@/lib/journal';

function highlight(line: string, terms: string[], first: { done: boolean }): ReactNode {
  if (terms.length === 0) return line;
  const matches = findMatches(line, terms);
  if (matches.length === 0) return line;
  const out: ReactNode[] = [];
  let at = 0;
  for (const [s, e] of matches) {
    if (s < at) continue; // two keywords overlap
    out.push(line.slice(at, s));
    const isFirst = !first.done;
    first.done = true;
    out.push(
      <mark key={s} data-first={isFirst || undefined} className="rounded-[2px] bg-[var(--select)] text-ink">
        {line.slice(s, e)}
      </mark>,
    );
    at = e;
  }
  out.push(line.slice(at));
  return out;
}

/**
 * Reads a page back: raw text (pre-wrap), with "· 21:40" time marks and "› …" questions faint.
 * With `query` (opened from search) → highlight keywords and scroll to the first match.
 */
export default function ReadText({ text, query }: { text: string; query?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const terms = query ? queryTerms(query) : [];
  const first = { done: false };

  useEffect(() => {
    const mark = ref.current?.querySelector('mark[data-first]');
    mark?.scrollIntoView({ block: 'center' });
  }, [query]);

  const lines = text.split('\n');
  return (
    <div ref={ref} className="page-text">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {isMarkLine(line) ? <span className="text-faint">{line}</span> : highlight(line, terms, first)}
          {i < lines.length - 1 && '\n'}
        </Fragment>
      ))}
    </div>
  );
}

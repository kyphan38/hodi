'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { addMonths, dayLong, monthLabel, monthOf } from '@/lib/day';
import { buildHeatmap, buildMonth, type HeatCell } from '@/lib/journal';
import type { Entry } from '@/types/hodi';

// Ink weight per level. Monochrome: only opacity changes, never color.
const ALPHA = [0.07, 0.24, 0.44, 0.68, 0.92];
const CELL = 9;
const GAP = 2;
// Kept per session: open a day from the month, go back, land on the same month.
const MONTH_KEY = 'hodi.days.heatmap';

function readMonth(): string | null {
  try {
    return sessionStorage.getItem(MONTH_KEY);
  } catch {
    return null;
  }
}

function writeMonth(month: string | null) {
  try {
    if (month) sessionStorage.setItem(MONTH_KEY, month);
    else sessionStorage.removeItem(MONTH_KEY);
  } catch {
    // ignore
  }
}

const label = (c: HeatCell) => `${dayLong(c.date)} · ${c.words} ${c.words === 1 ? 'word' : 'words'}`;

function cellStyle(c: HeatCell) {
  return {
    width: CELL,
    height: CELL,
    background: c.future ? 'transparent' : `rgb(var(--heat) / ${ALPHA[c.level]})`,
  };
}

/**
 * GitHub-style grid for one year: darker cell = more words that day. Shows at
 * a glance when writing was steady and when it stopped. The cells are too small
 * to hit on a phone, so a tap zooms into that month; a tap there opens the day.
 */
export default function Heatmap({ entries, today }: { entries: Entry[]; today: string }) {
  const [month, setMonth] = useState(readMonth);
  const open = (m: string | null) => {
    setMonth(m);
    writeMonth(m);
  };

  return (
    <figure className="m-0">
      {month ? (
        <Month key={month} entries={entries} today={today} month={month} onMonth={open} />
      ) : (
        <Year entries={entries} today={today} onMonth={open} />
      )}
      <figcaption className="mt-2 flex items-center justify-end gap-1 font-mono text-[10px] text-faint">
        <span className="mr-1">less</span>
        {ALPHA.map((a) => (
          <span key={a} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: `rgb(var(--heat) / ${a})` }} />
        ))}
        <span className="ml-1">more</span>
      </figcaption>
    </figure>
  );
}

/** Narrower than the screen → scrolls sideways, starting at the latest week. */
function Year({ entries, today, onMonth }: { entries: Entry[]; today: string; onMonth: (m: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { weeks, months } = useMemo(() => buildHeatmap(entries, today), [entries, today]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const step = CELL + GAP;

  return (
    <div className="zoom">
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <div style={{ width: weeks.length * step - GAP }}>
          <div className="relative h-4 font-mono text-[10px] text-faint" aria-hidden>
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute top-0" style={{ left: m.col * step }}>
                {m.label}
              </span>
            ))}
          </div>
          <div
            role="group"
            aria-label="Writing activity, last 12 months"
            className="grid grid-flow-col"
            style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP }}
            onClick={(e) => {
              const date = (e.target as HTMLElement).dataset.date;
              if (date) onMonth(monthOf(date));
            }}
          >
            {weeks.flat().map((c) =>
              c.future ? (
                <span key={c.date} style={cellStyle(c)} />
              ) : (
                <span
                  key={c.date}
                  data-date={c.date}
                  title={label(c)}
                  className="cursor-pointer rounded-[2px]"
                  style={cellStyle(c)}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const nav = 'px-2 py-2 font-mono text-[11px] text-faint hover:text-ink disabled:invisible';

/** One month, big enough to tap. Empty days open too: that is how to write a missed day. */
function Month({
  entries,
  today,
  month,
  onMonth,
}: {
  entries: Entry[];
  today: string;
  month: string;
  onMonth: (m: string | null) => void;
}) {
  const router = useRouter();
  const rows = useMemo(() => buildMonth(entries, month, today), [entries, month, today]);
  // Back as far as the year grid reaches, or to the oldest page if older.
  const oldest = entries.reduce((m, e) => (e.date < m ? e.date : m), today);
  const first = [monthOf(oldest), addMonths(monthOf(today), -12)].sort()[0];
  const last = monthOf(today);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) onMonth(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onMonth]);

  return (
    <div className="zoom max-w-sm">
      <div className="flex items-baseline justify-between">
        <div className="-mx-2 flex items-baseline">
          <button type="button" onClick={() => onMonth(addMonths(month, -1))} disabled={month <= first} className={nav} aria-label="Previous month">
            ‹
          </button>
          <span className="font-mono text-[11px] tracking-[0.1em] text-faint uppercase">{monthLabel(month)}</span>
          <button type="button" onClick={() => onMonth(addMonths(month, 1))} disabled={month >= last} className={nav} aria-label="Next month">
            ›
          </button>
        </div>
        <button type="button" onClick={() => onMonth(null)} className={`-mr-2 ${nav}`}>
          year
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-[3px] font-mono text-[10px] text-faint" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div role="group" aria-label={monthLabel(month)} className="mt-1 grid grid-cols-7 gap-[3px]">
        {rows.flat().map((c, i) =>
          !c ? (
            <span key={i} />
          ) : (
            <button
              key={c.date}
              type="button"
              disabled={c.future}
              onClick={() => router.push(`/day/?d=${c.date}`)}
              title={label(c)}
              aria-label={label(c)}
              className={`aspect-square rounded-[3px] font-mono text-[11px] disabled:text-faint/50 ${
                c.date === today ? 'outline outline-1 outline-offset-1 outline-ink' : ''
              } ${c.level >= 3 ? 'text-bg' : 'text-muted'}`}
              style={{ background: c.future ? 'transparent' : `rgb(var(--heat) / ${ALPHA[c.level]})` }}
            >
              {Number(c.date.slice(8))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

import ReadText from '@/components/ReadText';
import { dayLong, dayOf } from '@/lib/day';
import { openOnFor, readyLetters, validOpenOn, waitingLetters, type OpenChoice } from '@/lib/letter-dates';
import { markOpened, sendLetter, watchLetters, type Letter } from '@/lib/letters';

const CHOICES: { v: OpenChoice; label: string }[] = [
  { v: '1m', label: 'in a month' },
  { v: '6m', label: 'in 6 months' },
  { v: '1y', label: 'in a year' },
];

export function useLetters(uid: string): Letter[] | null {
  const [list, setList] = useState<Letter[] | null>(null);
  useEffect(() => watchLetters(uid, setList), [uid]);
  return list;
}

/**
 * Days page (H1): write a letter to the future and pick when it opens.
 * Sealed letters only show as a count; opened ones can be read again here.
 */
export function LetterBox({ uid, today }: { uid: string; today: string }) {
  const letters = useLetters(uid);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<OpenChoice | 'date'>('1y');
  const [date, setDate] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const openOn = choice === 'date' ? date : openOnFor(today, choice);
  const ok = text.trim().length > 0 && validOpenOn(today, openOn);
  const waiting = letters ? waitingLetters(letters, today) : [];
  const opened = (letters ?? []).filter((l) => l.openedAt !== null).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="mt-8 text-[15px]">
      <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] text-faint">
        {!writing && (
          <button type="button" onClick={() => setWriting(true)} className="hover:text-ink">
            letter
          </button>
        )}
        {waiting.length > 0 && (
          <span>
            {!writing && '· '}
            {waiting.length} {waiting.length === 1 ? 'letter' : 'letters'} waiting
          </span>
        )}
        {sent && <span>· sealed until {dayLong(sent)}</span>}
      </p>

      {writing && (
        <div className="mt-3 space-y-3">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Dear future me,"
            aria-label="Letter to the future"
            className="w-full resize-y border-b border-line bg-transparent pb-2 text-base leading-relaxed placeholder:text-faint focus:border-faint focus-visible:outline-none"
          />
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[14px]" role="radiogroup" aria-label="Opens">
            <span className="text-faint">opens</span>
            {CHOICES.map((c) => (
              <button key={c.v} type="button" role="radio" aria-checked={choice === c.v} onClick={() => setChoice(c.v)} className={choice === c.v ? 'text-ink' : 'text-faint hover:text-muted'}>
                {c.label}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={choice === 'date'} onClick={() => setChoice('date')} className={choice === 'date' ? 'text-ink' : 'text-faint hover:text-muted'}>
              on a date
            </button>
            {choice === 'date' && (
              <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} aria-label="Open on" className="bg-transparent text-ink" />
            )}
          </p>
          <p className="flex items-baseline gap-5 font-mono text-[11px]">
            <button
              type="button"
              disabled={!ok}
              onClick={() => {
                sendLetter(uid, text.trim(), openOn);
                setSent(openOn);
                setText('');
                setWriting(false);
              }}
              className="text-ink disabled:text-faint"
            >
              seal
            </button>
            <button type="button" onClick={() => setWriting(false)} className="text-faint hover:text-ink">
              cancel
            </button>
            {ok && <span className="text-faint">opens {dayLong(openOn)}</span>}
          </p>
        </div>
      )}

      {opened.length > 0 && (
        <ul className="mt-3">
          {opened.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} className="py-1 text-left font-mono text-[11px] text-faint hover:text-ink">
                letter from {dayLong(dayOf(l.createdAt))}
              </button>
              {open === l.id && (
                <div className="mb-3 text-muted [--text-size:15px]">
                  <ReadText text={l.text} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Today (H1): a letter whose day has come. Tap to read; reading marks it opened. */
export function LetterArrived({ uid, today }: { uid: string; today: string }) {
  const letters = useLetters(uid);
  const [reading, setReading] = useState<Letter | null>(null);
  const ready = letters ? readyLetters(letters, today) : [];
  if (reading) {
    return (
      <div className="text-muted [--text-size:15px]">
        <p className="mb-2 text-[14px] text-faint">A letter from {dayLong(dayOf(reading.createdAt))}</p>
        <ReadText text={reading.text} />
      </div>
    );
  }
  if (ready.length === 0) return null;
  const l = ready[0];
  return (
    <p>
      <button
        type="button"
        onClick={() => {
          setReading(l);
          markOpened(uid, l.id);
        }}
        className="text-[14px] text-faint hover:text-muted"
      >
        A letter from {dayLong(dayOf(l.createdAt))}
      </button>
    </p>
  );
}

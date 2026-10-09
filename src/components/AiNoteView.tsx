'use client';

import { useState, type ReactNode } from 'react';

import { useJournal } from '@/contexts/JournalContext';
import { dayTiny } from '@/lib/day';
import { keepLesson } from '@/lib/lessons';
import type { AiNote } from '@/types/hodi';

const label = 'font-mono text-[11px] tracking-[0.04em] text-faint';

const TITLE: Record<AiNote['kind'], string> = {
  reflect: 'reflect',
  nextTime: 'next time',
  lookBack: 'look back',
  story: 'story',
  onThisDay: 'then and now',
};

/** One AI note under its block: faint, indented, tap the label to fold. */
export default function AiNoteView({ uid, note, flush }: { uid: string; note: AiNote; flush?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`${flush ? '' : 'ml-15'} mt-1 mb-3 border-l border-line pl-4 text-[14px] leading-relaxed`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${label} py-1 hover:text-ink`}>
        {TITLE[note.kind]}
        {open ? '' : ' ·'}
      </button>
      {open && note.kind === 'reflect' && <Reflect uid={uid} note={note} />}
      {open && note.kind === 'nextTime' && <NextTime uid={uid} note={note} />}
      {open && note.kind === 'lookBack' && <LookBack note={note} />}
      {open && note.kind === 'story' && <Story note={note} />}
      {open && note.kind === 'onThisDay' && <ThenNow note={note} />}
    </div>
  );
}

function Reflect({ uid, note }: { uid: string; note: Extract<AiNote, { kind: 'reflect' }> }) {
  const r = note.result;
  return (
    <>
      <p className="text-muted">{r.mirror}</p>
      {r.question && <p className="mt-1 text-faint">{r.question}</p>}
      {r.steps.length > 0 && (
        <Section title="try">
          <Steps uid={uid} steps={r.steps} situation={r.mirror} day={note.day} />
        </Section>
      )}
    </>
  );
}

function NextTime({ uid, note }: { uid: string; note: Extract<AiNote, { kind: 'nextTime' }> }) {
  const r = note.result;
  return (
    <>
      <p className="text-muted">{r.happened}</p>
      {r.didWell && (
        <Section title="went well">
          <p className="text-muted">{r.didWell}</p>
        </Section>
      )}
      {r.steps.length > 0 && (
        <Section title="try">
          <Steps uid={uid} steps={r.steps} situation={r.happened} day={note.day} />
        </Section>
      )}
      {r.helpedBefore.length > 0 && (
        <Section title="helped before">
          <Dated items={r.helpedBefore} />
        </Section>
      )}
    </>
  );
}

function LookBack({ note }: { note: Extract<AiNote, { kind: 'lookBack' }> }) {
  const r = note.result;
  return (
    <>
      <ul className="space-y-2">
        {r.patterns.map((p) => (
          <li key={p.text}>
            <p className="text-muted">{p.text}</p>
            {p.days.length > 0 && <p className={label}>{p.days.map(dayTiny).join(' · ')}</p>}
          </li>
        ))}
      </ul>
      {r.question && <p className="mt-2 text-faint">{r.question}</p>}
    </>
  );
}

function Story({ note }: { note: Extract<AiNote, { kind: 'story' }> }) {
  const r = note.result;
  return (
    <>
      <p className="text-muted">&ldquo;{r.story}&rdquo;</p>
      {r.against.length > 0 && (
        <Section title="does not fit">
          <Dated items={r.against} />
        </Section>
      )}
      <Section title="truer">
        <p className="text-muted">{r.kinder}</p>
      </Section>
      {r.question && <p className="mt-2 text-faint">{r.question}</p>}
    </>
  );
}

function ThenNow({ note }: { note: Extract<AiNote, { kind: 'onThisDay' }> }) {
  const r = note.result;
  return (
    <>
      <Section title={dayTiny(note.source) + ' ' + note.source.slice(0, 4)}>
        <p className="text-muted">{r.then}</p>
      </Section>
      {r.now && (
        <Section title="now">
          <p className="text-muted">{r.now}</p>
        </Section>
      )}
      {r.question && <p className="mt-2 text-faint">{r.question}</p>}
    </>
  );
}

function Dated({ items }: { items: { day: string; text: string }[] }) {
  return (
    <ul className="space-y-1">
      {items.map((h) => (
        <li key={h.day + h.text} className="flex gap-3">
          <span className={`${label} w-12 shrink-0 pt-0.5`}>{dayTiny(h.day)}</span>
          <span className="text-muted">{h.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <p className={label}>{title}</p>
      {children}
    </div>
  );
}

/** Each step can be kept as a lesson; a kept step shows "kept" instead. */
function Steps({ uid, steps, situation, day }: { uid: string; steps: string[]; situation: string; day: string }) {
  const { lessons } = useJournal();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <ul className="space-y-1">
      {steps.map((s) => {
        const kept = lessons.some((l) => l.text === s && l.sourceDay === day);
        return (
          <li key={s} className="flex items-baseline justify-between gap-4">
            <span className="text-muted">{s}</span>
            {kept ? (
              <span className={label}>kept</span>
            ) : (
              <button
                type="button"
                disabled={busy === s}
                onClick={async () => {
                  setBusy(s);
                  try {
                    await keepLesson(uid, { text: s, situation, sourceDay: day });
                  } catch (err) {
                    console.error('[lessons] keep failed', err);
                  } finally {
                    setBusy(null);
                  }
                }}
                className={`${label} shrink-0 hover:text-ink disabled:opacity-40`}
              >
                keep
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

import GrowText from '@/components/GrowText';
import TopBar from '@/components/TopBar';
import { useUid } from '@/components/AuthGate';
import { useJournal } from '@/contexts/JournalContext';
import { analyzeRange, searchByMeaning, talkAbout, type MeaningHit } from '@/lib/ai';
import { clockStore } from '@/lib/clock';
import { dayLong, dayOf, dayShort, dayTiny, isDayId } from '@/lib/day';
import { getDb } from '@/lib/firebase-client';
import { keepLesson, updateLesson } from '@/lib/lessons';
import type { Analysis, Dated, Lesson, Range, Talk } from '@/types/hodi';

// ============================================================
// hodi - Insight: every AI feature in one page (PLAN-ai A8)
//
// Analyze a range of days (with a short talk on each), search by meaning,
// the kept lessons and the history. Analyses live for one day: tomorrow the
// page starts empty, and today's ones move to the history (read-only).
// Today stays a plain writing page.
// ============================================================

const label = 'font-mono text-[11px] tracking-[0.04em] text-faint';
const link = `${label} py-1 hover:text-ink`;

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'today' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export default function InsightView() {
  const uid = useUid();
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);
  const [range, setRange] = useState<Range>('today');
  const analyses = useAnalyses(uid);
  const past = useSearchParams().get('d');

  if (isDayId(past) && past !== today) return <PastDay uid={uid} day={past} analyses={analyses} />;

  return (
    <main className="paper pb-24">
      <TopBar current="insight" left="insight" />

      <div className="mt-10 flex gap-4 text-[15px]" role="radiogroup" aria-label="Range">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={r.value === range}
            onClick={() => setRange(r.value)}
            className={r.value === range ? 'text-ink' : 'text-faint hover:text-muted'}
          >
            {r.label}
          </button>
        ))}
      </div>

      <RangeAnalysis
        key={range}
        uid={uid}
        today={today}
        range={range}
        latest={analyses.filter((a) => a.range === range && a.day === today).at(-1)}
      />

      <MeaningSearch />

      <Lessons uid={uid} />

      <History analyses={analyses} today={today} />
    </main>
  );
}

/** All analyses, oldest first. Only a few per day, so one listener is fine. */
function useAnalyses(uid: string): Analysis[] {
  const [list, setList] = useState<Analysis[]>([]);
  useEffect(() => {
    const q = query(collection(getDb(), 'users', uid, 'aiNotes'), where('kind', '==', 'analysis'));
    return onSnapshot(
      q,
      (snap) =>
        setList(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<Analysis, 'id'>), id: d.id }))
            .sort((a, b) => a.createdAt - b.createdAt),
        ),
      (err) => console.error('[ai] analyses watch failed', err),
    );
  }, [uid]);
  return list;
}

function rangeTitle(a: Pick<Analysis, 'from' | 'to'>): string {
  return a.from === a.to ? dayTiny(a.from) : `${dayTiny(a.from)} - ${dayTiny(a.to)}`;
}

function RangeAnalysis({
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
  const run = async () => {
    setState('busy');
    try {
      await analyzeRange(today, range);
      setState('idle');
    } catch (err) {
      console.warn('[ai] analyze failed', err);
      const code = (err as { code?: string }).code ?? '';
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
          <span className={label}>reading…</span>
        ) : (
          <button type="button" onClick={run} className={link}>
            {latest ? 'analyze again' : 'analyze'}
          </button>
        )}
        {state === 'failed' && <span className={label}>failed</span>}
        {state === 'empty' && <span className={label}>no pages in this range</span>}
        {latest && outdated && state !== 'busy' && <span className={label}>new writing since</span>}
      </p>
      {latest && <AnalysisView uid={uid} a={latest} live />}
    </section>
  );
}

/** `live`: today's analysis, the talk can go on. Past ones are read-only. */
function AnalysisView({ uid, a, live = false }: { uid: string; a: Analysis; live?: boolean }) {
  const r = a.result;
  const talk = useTalk(uid, a.id);
  const [talking, setTalking] = useState(false);
  const showTalk = talking || !!talk;
  return (
    <article className="mt-4 text-[15px] leading-relaxed">
      <p className={label}>{rangeTitle(a)}</p>
      <p className="mt-1 text-muted">{r.overview}</p>
      <DatedSection title="gives energy" items={r.gives} />
      <DatedSection title="takes energy" items={r.takes} />
      <DatedSection title="keeps coming back" items={r.patterns} />
      <DatedSection title="went well" items={r.wins} />
      {r.story && (
        <Section title="the story">
          <p className="text-muted">&ldquo;{r.story.story}&rdquo;</p>
          {r.story.against.length > 0 && (
            <>
              <p className={`${label} mt-2`}>does not fit</p>
              <DatedList items={r.story.against} />
            </>
          )}
          <p className={`${label} mt-2`}>truer</p>
          <p className="text-muted">{r.story.truer}</p>
        </Section>
      )}
      {r.steps.length > 0 && (
        <Section title="next time, try">
          <Steps uid={uid} steps={r.steps} situation={r.overview} day={a.to} />
        </Section>
      )}
      <DatedSection title="helped before" items={r.helpedBefore} />
      {r.lessonsInAction && r.lessonsInAction.length > 0 && (
        <Section title="lessons in action">
          <ul className="space-y-3">
            {r.lessonsInAction.map((x) => (
              <li key={x.lesson + x.text}>
                <p className={label}>
                  {x.used ? 'used' : 'could have helped'} · {x.lesson}
                </p>
                <DatedList items={[x]} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {r.question && !showTalk && (
        <div className="mt-5">
          <p className="text-faint">{r.question}</p>
          {live && (
            <button type="button" onClick={() => setTalking(true)} className={link}>
              write about this
            </button>
          )}
        </div>
      )}
      {showTalk && <TalkView uid={uid} a={a} talk={talk} live={live} />}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <p className={label}>{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DatedSection({ title, items }: { title: string; items: Dated[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <DatedList items={items} />
    </Section>
  );
}

/** Each item with the days it shows up; a day opens that page. */
function DatedList({ items }: { items: Dated[] }) {
  const thisYear = String(new Date().getFullYear());
  return (
    <ul className="space-y-2">
      {items.map((x) => (
        <li key={x.text}>
          <span className="text-muted">{x.text}</span>
          {x.days.length > 0 && (
            <span className="ml-2 inline-flex flex-wrap gap-x-2">
              {x.days.map((d) => (
                <Link key={d} href={`/day/?d=${d}`} className={`${label} hover:text-ink`}>
                  {dayTiny(d)}
                  {d.slice(0, 4) !== thisYear ? ` ${d.slice(0, 4)}` : ''}
                </Link>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Each step can be kept as a lesson; a kept step shows "kept" instead. */
function Steps({ uid, steps, situation, day }: { uid: string; steps: string[]; situation: string; day: string }) {
  const { lessons } = useJournal();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {steps.map((s) => {
        const kept = lessons.some((l) => l.text === s && l.sourceDay === day);
        return (
          <li key={s} className="flex items-baseline justify-between gap-4">
            <span className="text-muted">{s}</span>
            {kept ? (
              <span className={`${label} shrink-0`}>kept</span>
            ) : (
              <button
                type="button"
                disabled={busy === s}
                onClick={async () => {
                  setBusy(s);
                  try {
                    await keepLesson(uid, { text: s, situation: situation.slice(0, 300), sourceDay: day });
                  } catch (err) {
                    console.error('[lessons] keep failed', err);
                  } finally {
                    setBusy(null);
                  }
                }}
                className={`${link} shrink-0 disabled:opacity-40`}
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

// ---- Search by meaning ----

function MeaningSearch() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'failed' | { hits: MeaningHit[]; partial: boolean }>('idle');
  const run = async () => {
    const text = q.trim();
    if (!text) return;
    setState('busy');
    try {
      setState(await searchByMeaning(text));
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
      {state === 'busy' && <p className={`${label} mt-4`}>searching…</p>}
      {state === 'failed' && <p className={`${label} mt-4`}>failed</p>}
      {typeof state === 'object' && (
        <>
          {state.partial && (
            <p className="mt-4 text-[13px] text-faint">
              Still reading older pages.{' '}
              <button type="button" onClick={run} className="underline decoration-line underline-offset-4 hover:text-ink">
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
        </>
      )}
    </section>
  );
}

// ---- Lessons ----

/** Kept steps. Tap one to edit; archive hides it (rule #6: no delete). */
function Lessons({ uid }: { uid: string }) {
  const { lessons } = useJournal();
  const [editing, setEditing] = useState<string | null>(null);
  const active = lessons.filter((l) => !l.archived);
  if (active.length === 0) return null;
  return (
    <section className="mt-16">
      <p className={label}>lessons</p>
      <ul className="mt-3 space-y-5">
        {active.map((l) =>
          editing === l.id ? (
            <LessonEditor key={l.id} uid={uid} lesson={l} onClose={() => setEditing(null)} />
          ) : (
            <li key={l.id}>
              <button type="button" onClick={() => setEditing(l.id)} className="group block w-full text-left">
                <span className="block text-[15px] text-muted group-hover:text-ink">{l.text}</span>
                <span className={`${label} mt-1 block`}>{dayTiny(l.sourceDay)}</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function LessonEditor({ uid, lesson, onClose }: { uid: string; lesson: Lesson; onClose: () => void }) {
  const [text, setText] = useState(lesson.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const save = (patch: { text?: string; archived?: boolean }) => {
    updateLesson(uid, lesson.id, patch).catch((err) => console.error('[lessons] update failed', err));
    onClose();
  };
  return (
    <li className="page-text">
      <GrowText value={text} onChange={setText} label="Lesson" textareaRef={ref} />
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <button type="button" onClick={() => save({ archived: true })} className={link}>
          archive
        </button>
        <p className="flex gap-2">
          <button type="button" onClick={onClose} className={link}>
            cancel
          </button>
          <span className="py-1 text-[11px] text-faint">·</span>
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => save({ text: text.trim() })}
            className={`${link} disabled:opacity-40`}
          >
            save
          </button>
        </p>
      </div>
    </li>
  );
}

// ---- Talk ("write about this") ----

function useTalk(uid: string, analysisId: string): Talk | null {
  const [talk, setTalk] = useState<Talk | null>(null);
  useEffect(
    () =>
      onSnapshot(
        doc(getDb(), 'users', uid, 'aiChats', analysisId),
        (snap) => setTalk(snap.exists() ? ({ ...(snap.data() as Omit<Talk, 'id'>), id: snap.id } as Talk) : null),
        (err) => console.error('[ai] talk watch failed', err),
      ),
    [uid, analysisId],
  );
  return talk;
}

/**
 * A short chat that starts from the analysis question. The function stores
 * both sides; until the first reply the question is shown on its own.
 */
function TalkView({ uid, a, talk, live }: { uid: string; a: Analysis; talk: Talk | null; live: boolean }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const messages = talk?.messages ?? [{ role: 'ai' as const, text: a.result.question, at: a.createdAt }];
  const open = live && !talk?.done;

  useEffect(() => {
    if (open) ref.current?.focus({ preventScroll: true });
  }, [open]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || pending) return;
    setPending(msg);
    setText('');
    setFailed(false);
    try {
      await talkAbout(a.id, a.day, msg);
    } catch (err) {
      console.warn('[ai] talk failed', err);
      setText(msg);
      setFailed(true);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className={label}>talk</p>
      <ul className="mt-2 space-y-4">
        {messages.map((m, i) => (
          <li key={i}>
            {m.role === 'me' ? (
              <p className="whitespace-pre-wrap text-ink">{m.text}</p>
            ) : (
              <>
                <p className="text-muted">{m.text}</p>
                {m.steps && m.steps.length > 0 && (
                  <div className="mt-2">
                    <Steps uid={uid} steps={m.steps} situation={a.result.question} day={a.day} />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
        {pending && (
          <li>
            <p className="whitespace-pre-wrap text-ink">{pending}</p>
            <p className={`${label} mt-2`}>…</p>
          </li>
        )}
      </ul>
      {open && !pending && (
        <div className="page-text mt-4">
          <GrowText value={text} onChange={setText} label="Your answer" placeholder="Write back" textareaRef={ref} />
          <p className="mt-2 flex items-baseline justify-end gap-3">
            {failed && <span className={label}>failed</span>}
            <button type="button" disabled={!text.trim()} onClick={send} className={`${link} disabled:opacity-40`}>
              send
            </button>
          </p>
        </div>
      )}
      {talk?.done && <p className={`${label} mt-4`}>closed</p>}
    </div>
  );
}

// ---- History ----

/** Past days with analyses, newest first. Each opens a read-only view. */
function History({ analyses, today }: { analyses: Analysis[]; today: string }) {
  const days = [...new Set(analyses.filter((a) => a.day < today).map((a) => a.day))].sort().reverse();
  if (days.length === 0) return null;
  return (
    <section className="mt-16">
      <p className={label}>history</p>
      <ul className="mt-3">
        {days.slice(0, HISTORY_DAYS).map((d) => {
          const ranges = RANGES.filter((r) => analyses.some((a) => a.day === d && a.range === r.value));
          return (
            <li key={d}>
              <Link href={`/insight/?d=${d}`} className="group flex items-baseline gap-4 py-1.5">
                <span className="w-14 shrink-0 text-[13px] whitespace-nowrap text-faint tabular-nums">{dayShort(d)}</span>
                <span className="text-muted group-hover:text-ink">{ranges.map((r) => r.label).join(' · ')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const HISTORY_DAYS = 60;

/** A past day: its newest analysis per range, with the talk, read-only. */
function PastDay({ uid, day, analyses }: { uid: string; day: string; analyses: Analysis[] }) {
  const list = RANGES.map((r) => analyses.filter((a) => a.day === day && a.range === r.value).at(-1)).filter(
    (a): a is Analysis => !!a,
  );
  return (
    <main className="paper pb-24">
      <TopBar current="insight" left={<Link href="/insight/">insight</Link>} />
      <p className="mt-10 text-[15px] text-ink">{dayLong(day)}</p>
      {list.length === 0 && <p className="mt-6 text-faint">Nothing on this day.</p>}
      {list.map((a) => (
        <section key={a.id} className="mt-10">
          <p className={label}>{RANGES.find((r) => r.value === a.range)?.label}</p>
          <AnalysisView uid={uid} a={a} />
        </section>
      ))}
    </main>
  );
}

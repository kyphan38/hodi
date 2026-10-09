'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useSyncExternalStore } from 'react';

import AiNoteView from '@/components/AiNoteView';
import Editor from '@/components/Editor';
import ReadText from '@/components/ReadText';
import StatusDot from '@/components/StatusDot';
import TopBar from '@/components/TopBar';
import { scrollToTop } from '@/components/TodayView';
import { useUid } from '@/components/AuthGate';
import { useJournal } from '@/contexts/JournalContext';
import { useAiNotes } from '@/hooks/useAiNotes';
import { usePage } from '@/hooks/usePage';
import { useSaveShortcut } from '@/hooks/useSaveShortcut';
import { lookBackPeriod } from '@/lib/ai';
import { clockStore } from '@/lib/clock';
import { countWords, dayOf, dayShort } from '@/lib/day';
import { firstLine, hasWords } from '@/lib/journal';
import { reviewKey } from '@/lib/page-data';
import { aiStore } from '@/lib/prefs';
import { periodDays, reviewInvites, reviewKind, reviewTitle, type ReviewKind } from '@/lib/review';

const PLACEHOLDER: Record<ReviewKind, string> = {
  week: 'What is worth remembering from this week?',
  month: 'What is worth remembering from this month?',
};

/** /review/?p=2026-W40 or ?p=2026-10. */
export default function ReviewView() {
  const params = useSearchParams();
  const period = params.get('p') ?? '';
  const kind = reviewKind(period);
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);

  if (!kind) {
    return (
      <main className="paper">
        <TopBar current={null} />
        <p className="mt-16 text-faint">This page does not exist.</p>
      </main>
    );
  }
  if (periodDays(period)[0] > today) {
    return (
      <main className="paper">
        <TopBar current={null} left={reviewTitle(period)} />
        <p className="mt-16 text-faint">Not yet.</p>
      </main>
    );
  }
  return <ReviewPage key={period} period={period} kind={kind} />;
}

function ReviewPage({ period, kind }: { period: string; kind: ReviewKind }) {
  const uid = useUid();
  const page = usePage(uid, reviewKey(period));
  const [flash, setFlash] = useState(0);

  useSaveShortcut(() => {
    page.flush();
    setFlash((n) => n + 1);
  });

  return (
    <main className="paper">
      <TopBar
        current={null}
        left={
          <button type="button" onClick={scrollToTop} className="py-2 uppercase">
            {reviewTitle(period)}
          </button>
        }
      />
      <PeriodPages period={period} />
      <LookBack uid={uid} period={period} />
      <div className="mt-12">
        <Editor
          value={page.text}
          onChange={page.setText}
          placeholder={PLACEHOLDER[kind]}
          loaded={page.loaded}
          label={`Review for ${reviewTitle(period)}`}
        />
      </div>
      <StatusDot status={page.status} words={countWords(page.text)} flash={flash} />
    </main>
  );
}

/** AI "look back": the newest note for this period, and a link to ask again. */
function LookBack({ uid, period }: { uid: string; period: string }) {
  const aiOn = useSyncExternalStore(aiStore.subscribe, aiStore.get, aiStore.getServer) === 'on';
  const { entries } = useJournal();
  const notes = useAiNotes(uid, period, aiOn);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasPages = useMemo(() => {
    const days = new Set(periodDays(period));
    return entries.some((e) => days.has(e.date) && hasWords(e));
  }, [entries, period]);

  if (!aiOn || !hasPages) return null;
  const latest = notes.filter((n) => n.kind === 'lookBack').at(-1);
  const ask = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await lookBackPeriod(period);
    } catch (err) {
      console.warn('[ai] look back failed', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const link = 'py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink';
  return (
    <div className="mt-8">
      {latest && <AiNoteView uid={uid} note={latest} flush />}
      {busy ? (
        <span className="py-1 font-mono text-[11px] text-faint">…</span>
      ) : (
        <p className="flex gap-2">
          <button type="button" onClick={ask} className={link}>
            {latest ? 'look again' : 'look back'}
          </button>
          {failed && <span className="py-1 font-mono text-[11px] text-faint">failed</span>}
        </p>
      )}
    </div>
  );
}

/**
 * This period's pages, folded to their first line - to read back before the review.
 * Tap a line to open the full page in place.
 */
function PeriodPages({ period }: { period: string }) {
  const { entries, loaded } = useJournal();
  const [open, setOpen] = useState<string | null>(null);
  const pages = useMemo(() => {
    const days = new Set(periodDays(period));
    return entries.filter((e) => days.has(e.date) && hasWords(e)).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [entries, period]);

  if (!loaded) return null;
  if (pages.length === 0) {
    return <p className="mt-8 text-[15px] text-faint">No pages in this {reviewKind(period)}.</p>;
  }
  return (
    <ul className="mt-8">
      {pages.map((e) => (
        <li key={e.date}>
          <button
            type="button"
            onClick={() => setOpen((d) => (d === e.date ? null : e.date))}
            aria-expanded={open === e.date}
            className="flex w-full items-baseline gap-4 py-1.5 text-left"
          >
            <span className="w-14 shrink-0 text-[13px] whitespace-nowrap text-faint tabular-nums">{dayShort(e.date)}</span>
            <span className={`min-w-0 flex-1 text-[15px] text-muted ${open === e.date ? '' : 'truncate'}`}>
              {open === e.date ? '' : firstLine(e.text)}
            </span>
          </button>
          {open === e.date && (
            <div className="mb-4 pl-[4.5rem] text-muted [--text-size:15px]">
              <ReadText text={e.text} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Review invite on today's page: one faint line, only on Sunday/Monday and at
 * month end/start, gone once that review is written.
 */
export function ReviewInvites({ today }: { today: string }) {
  const { reviews, loaded } = useJournal();
  if (!loaded) return null;
  const written = new Set(reviews.filter(hasWords).map((r) => r.period));
  const invites = reviewInvites(today).filter((i) => !written.has(i.period));
  if (invites.length === 0) return null;
  return (
    <ul className="space-y-1">
      {invites.map((i) => (
        <li key={i.period}>
          <Link href={`/review/?p=${i.period}`} className="text-[14px] text-faint hover:text-muted">
            {i.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import Editor from '@/components/Editor';
import ReadText from '@/components/ReadText';
import StatusDot from '@/components/StatusDot';
import TopBar from '@/components/TopBar';
import { scrollToTop } from '@/components/TodayView';
import { useUid } from '@/components/AuthGate';
import { useJournal } from '@/contexts/JournalContext';
import { usePage } from '@/hooks/usePage';
import { useSaveShortcut } from '@/hooks/useSaveShortcut';
import { clockStore } from '@/lib/clock';
import { countWords, dayLabel, dayOf, dayTiny, isDayId } from '@/lib/day';
import { hasWords } from '@/lib/journal';
import { entryKey } from '@/lib/page-data';
import { askedIn } from '@/lib/questions';
import type { Entry } from '@/types/hodi';

/**
 * A past day. Read mode by default; "edit" (or ⌘E) opens the same editor as
 * today's page. Today goes straight to "/".
 */
export default function DayView() {
  const router = useRouter();
  const params = useSearchParams();
  const day = params.get('d');
  const query = params.get('q');
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);
  const valid = isDayId(day);

  useEffect(() => {
    if (day === today) router.replace('/');
  }, [day, today, router]);

  if (!valid) return <Message text="This page does not exist." />;
  if (day === today) return null;
  if (day > today) return <Message day={day} text="Not yet." />;
  // key: a new day rebuilds from scratch (the save hook is tied to one page).
  return <PastDay key={day} day={day} query={query} />;
}

function Message({ day, text }: { day?: string; text: string }) {
  return (
    <main className="paper">
      <TopBar current={null} left={day ? dayLabel(day) : ''} />
      <p className="mt-16 text-faint">{text}</p>
    </main>
  );
}

/** Previous / next written day (skips empty days), like turning pages. */
function neighbors(entries: Entry[], day: string, today: string): { older: string | null; newer: string | null } {
  // entries: newest first.
  const written = entries.filter((e) => hasWords(e) && e.date !== today);
  const older = written.find((e) => e.date < day)?.date ?? null;
  const newer = [...written].reverse().find((e) => e.date > day)?.date ?? null;
  return { older, newer: newer ?? (day < today ? today : null) };
}

const dayHref = (d: string, today: string) => (d === today ? '/' : `/day/?d=${d}`);

/** A swipe counts only if long and straight enough. Ignore swipes from the edge (iOS back). */
const SWIPE_MIN = 60;
const EDGE = 24;

function PastDay({ day, query }: { day: string; query: string | null }) {
  const router = useRouter();
  const { entries, loaded } = useJournal();
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);
  const [editing, setEditing] = useState(false);
  const entry = entries.find((e) => e.date === day) ?? null;
  const empty = !entry || !entry.text.trim();
  const { older, newer } = neighbors(entries, day, today);

  useEffect(() => {
    const go = (d: string | null) => {
      if (d) router.push(dayHref(d, today));
    };
    const typingIn = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT');

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditing((v) => !v);
        return;
      }
      if (editing || typingIn(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') go(older);
      if (e.key === 'ArrowRight') go(newer);
    };

    let start: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t.clientX < EDGE || t.clientX > window.innerWidth - EDGE ? null : { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!start || editing) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < 2 * Math.abs(dy)) return;
      // Like a notebook: drag the page left = next (newer) page.
      go(dx < 0 ? newer : older);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [editing, older, newer, today, router]);

  const editedOn = entry && dayOf(entry.updatedAt) > day ? dayTiny(dayOf(entry.updatedAt)) : null;
  // Questions now live in the page ("› …"); print one only when the page has no question line.
  const oldPrompt = entry?.prompt && askedIn(entry.text).size === 0 ? entry.prompt : null;

  return (
    <main className="paper">
      <TopBar
        current={null}
        left={
          <button type="button" onClick={scrollToTop} className="py-2 uppercase">
            {dayLabel(day)}
          </button>
        }
      />

      {editing ? (
        <DayEditor day={day} onDone={() => setEditing(false)} />
      ) : !loaded ? null : (
        <>
          {oldPrompt && <p className="mt-8 text-[15px] text-faint">{oldPrompt}</p>}
          <div className={oldPrompt ? 'mt-4' : 'mt-8'}>
            {empty ? <p className="text-faint">Nothing written this day.</p> : <ReadText text={entry.text} query={query} />}
          </div>
          <div className="mt-10 mb-[30dvh] flex items-baseline justify-between gap-4 font-mono text-[11px] text-faint">
            <p className="flex gap-2">
              {editedOn && (
                <>
                  <span>edited {editedOn}</span>
                  <span>·</span>
                </>
              )}
              <button type="button" onClick={() => setEditing(true)} className="hover:text-ink">
                {empty ? 'write' : 'edit'}
              </button>
            </p>
            <nav className="flex gap-2" aria-label="Turn the page">
              {older && (
                <Link href={dayHref(older, today)} className="hover:text-ink">
                  older
                </Link>
              )}
              {older && newer && <span>·</span>}
              {newer && (
                <Link href={dayHref(newer, today)} className="hover:text-ink">
                  newer
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </main>
  );
}

function DayEditor({ day, onDone }: { day: string; onDone: () => void }) {
  const uid = useUid();
  const page = usePage(uid, entryKey(day));
  const [flash, setFlash] = useState(0);

  useSaveShortcut(() => {
    page.flush();
    setFlash((n) => n + 1);
  });

  return (
    <div className="mt-8">
      <Editor
        value={page.text}
        onChange={page.setText}
        loaded={page.loaded}
        focusOnLoad
        label={`Page for ${dayLabel(day)}`}
        below={
          <button
            type="button"
            onClick={() => {
              page.flush();
              onDone();
            }}
            className="mt-6 py-1 font-mono text-[11px] text-faint hover:text-ink"
          >
            done
          </button>
        }
      />
      <StatusDot status={page.status} words={countWords(page.text)} flash={flash} />
    </div>
  );
}

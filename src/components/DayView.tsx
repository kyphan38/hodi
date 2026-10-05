'use client';

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
import { entryKey } from '@/lib/page-data';

/**
 * Một ngày đã qua. Mặc định là chế độ đọc; "edit" (hoặc ⌘E) mở cùng editor
 * như trang hôm nay. Hôm nay thì chuyển thẳng về "/".
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
  // key: đổi ngày là dựng lại từ đầu (hook lưu gắn với một trang).
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

function PastDay({ day, query }: { day: string; query: string | null }) {
  const { entries, loaded } = useJournal();
  const [editing, setEditing] = useState(false);
  const entry = entries.find((e) => e.date === day) ?? null;
  const empty = !entry || !entry.text.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditing((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const editedOn = entry && dayOf(entry.updatedAt) > day ? dayTiny(dayOf(entry.updatedAt)) : null;

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
          {entry?.prompt && <p className="mt-8 text-[15px] text-faint">{entry.prompt}</p>}
          <div className={entry?.prompt ? 'mt-4' : 'mt-8'}>
            {empty ? <p className="text-faint">Nothing written this day.</p> : <ReadText text={entry.text} query={query} />}
          </div>
          <p className="mt-10 mb-[30dvh] flex gap-2 font-mono text-[11px] text-faint">
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
        lastWriteAt={page.data?.updatedAt ?? null}
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

'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';

import AiNoteView from '@/components/AiNoteView';
import { useUid } from '@/components/AuthGate';
import { useJournal } from '@/contexts/JournalContext';
import { useAiNotes } from '@/hooks/useAiNotes';
import { thenAndNow } from '@/lib/ai';
import { onThisDay } from '@/lib/journal';
import { aiStore } from '@/lib/prefs';

const link = 'shrink-0 py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink';

/**
 * "On this day": a few faint lines under today's page, tap to read.
 * With AI on, "now?" compares that page with the last weeks.
 * Nothing from earlier years → nothing shown.
 */
export default function OnThisDay({ today }: { today: string }) {
  const uid = useUid();
  const { entries } = useJournal();
  const aiOn = useSyncExternalStore(aiStore.subscribe, aiStore.get, aiStore.getServer) === 'on';
  const notes = useAiNotes(uid, today, aiOn);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const list = useMemo(() => onThisDay(entries, today), [entries, today]);
  if (list.length === 0) return null;

  const ask = async (then: string) => {
    setBusy(then);
    setFailed(null);
    try {
      await thenAndNow(today, then);
    } catch (err) {
      console.warn('[ai] then and now failed', err);
      setFailed(then);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="space-y-1">
      {list.map((x) => {
        const note = notes.filter((n) => n.kind === 'onThisDay' && n.source === x.date).at(-1);
        return (
          <li key={x.date}>
            <div className="flex items-baseline gap-3">
              <Link href={`/day/?d=${x.date}`} className="group flex min-w-0 flex-1 items-baseline gap-3 text-faint">
                <span className="shrink-0 font-mono text-[11px]">
                  {x.years} {x.years === 1 ? 'year' : 'years'} ago
                </span>
                <span className="min-w-0 truncate text-[14px] group-hover:text-muted">{x.line}</span>
              </Link>
              {aiOn && !note &&
                (busy === x.date ? (
                  <span className={link}>…</span>
                ) : (
                  <button type="button" onClick={() => ask(x.date)} className={link} disabled={busy !== null}>
                    {failed === x.date ? 'failed, retry' : 'now?'}
                  </button>
                ))}
            </div>
            {note && <AiNoteView uid={uid} note={note} flush />}
          </li>
        );
      })}
    </ul>
  );
}

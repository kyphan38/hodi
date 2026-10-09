'use client';

import { useRef, useState } from 'react';

import GrowText from '@/components/GrowText';
import TopBar from '@/components/TopBar';
import { useUid } from '@/components/AuthGate';
import { useJournal } from '@/contexts/JournalContext';
import { dayTiny } from '@/lib/day';
import { updateLesson } from '@/lib/lessons';
import type { Lesson } from '@/types/hodi';

const link = 'py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink';

/** Kept "next time" steps. Tap one to edit; archive hides it (rule #6: no delete). */
export default function LessonsView() {
  const uid = useUid();
  const { lessons, loaded } = useJournal();
  const [editing, setEditing] = useState<string | null>(null);
  const active = lessons.filter((l) => !l.archived);

  return (
    <main className="paper pb-24">
      <TopBar current="lessons" left="lessons" />
      {loaded && active.length === 0 && (
        <p className="mt-10 text-[15px] text-faint">Keep a step from &quot;next time&quot; to see it here.</p>
      )}
      <ul className="mt-10 space-y-5">
        {active.map((l) =>
          editing === l.id ? (
            <LessonEditor key={l.id} uid={uid} lesson={l} onClose={() => setEditing(null)} />
          ) : (
            <li key={l.id}>
              <button type="button" onClick={() => setEditing(l.id)} className="group block w-full text-left">
                <span className="block text-[15px] text-muted group-hover:text-ink">{l.text}</span>
                <span className="mt-1 block text-[13px] text-faint">
                  <span className="font-mono text-[11px]">{dayTiny(l.sourceDay)}</span>
                  {l.situation && <> · {l.situation}</>}
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
    </main>
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

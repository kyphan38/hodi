'use client';

import { useState } from 'react';

import { label, link } from '@/components/insight/styles';
import { useJournal } from '@/contexts/JournalContext';
import { keepLesson } from '@/lib/lessons';

/** Each step can be kept as a lesson; a kept step shows "kept" instead. */
export default function Steps({ uid, steps, situation, day }: { uid: string; steps: string[]; situation: string; day: string }) {
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

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { dailyQuestion } from '@/lib/ai';
import { getDb } from '@/lib/firebase-client';
import { QUESTIONS } from '@/lib/questions';

/**
 * Today's AI-picked question (functions `daily`), or null: AI off, no recent
 * pages, offline, or still loading. Reads users/{uid}/meta/ai first so the
 * function runs once a day, not on every open.
 */
export function useDailyQuestion(uid: string, day: string, enabled: boolean): string | null {
  const [pick, setPick] = useState<{ day: string; text: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        const meta = (await getDoc(doc(getDb(), 'users', uid, 'meta', 'ai'))).data() as
          | { questionFor?: { day: string; text: string } }
          | undefined;
        let text = meta?.questionFor?.day === day ? meta.questionFor.text : null;
        if (text === null) text = (await dailyQuestion(day, QUESTIONS)).question ?? '';
        if (alive && text) setPick({ day, text });
      } catch (err) {
        console.warn('[ai] daily question failed', err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, day, enabled]);
  return enabled && pick?.day === day ? pick.text : null;
}

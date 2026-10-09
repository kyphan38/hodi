'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { dailyQuestion } from '@/lib/ai';
import { getDb } from '@/lib/firebase-client';
import { QUESTIONS } from '@/lib/questions';

type Cached = { day: string; text: string } | null | undefined;

const BUSY_RETRY_MS = 20_000;

/**
 * Today's AI questions (functions `daily`), in show order: a follow-up on a
 * promise (asked once), then the day's picked question. Empty when AI is off,
 * offline or still loading. Reads users/{uid}/meta/ai first so the function
 * runs once a day, not on every open.
 */
export function useDailyQuestions(uid: string, day: string, enabled: boolean): string[] {
  const [got, setGot] = useState<{ day: string; list: string[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        const meta = (await getDoc(doc(getDb(), 'users', uid, 'meta', 'ai'))).data() as
          | { questionFor?: Cached; followUpFor?: Cached }
          | undefined;
        let list: (string | null)[];
        if (meta?.questionFor?.day === day) {
          list = [meta.followUpFor?.day === day ? meta.followUpFor.text : null, meta.questionFor.text];
        } else {
          let res = await dailyQuestion(day, QUESTIONS);
          // Another open is running it right now: ask again once it is done.
          if (res.busy) {
            await new Promise((r) => setTimeout(r, BUSY_RETRY_MS));
            if (!alive) return;
            res = await dailyQuestion(day, QUESTIONS);
          }
          list = [res.followUp, res.question];
        }
        if (alive) setGot({ day, list: list.filter((q): q is string => !!q) });
      } catch (err) {
        console.warn('[ai] daily questions failed', err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, day, enabled]);
  return enabled && got?.day === day ? got.list : NONE;
}

const NONE: string[] = [];

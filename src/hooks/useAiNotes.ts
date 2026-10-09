'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import type { AiNote } from '@/types/hodi';

/** AI notes for one day, oldest first. Empty while AI is off (no listener). */
export function useAiNotes(uid: string, day: string, enabled: boolean): AiNote[] {
  const [notes, setNotes] = useState<AiNote[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(getDb(), 'users', uid, 'aiNotes'), where('day', '==', day));
    return onSnapshot(
      q,
      (snap) =>
        setNotes(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<AiNote, 'id'>), id: d.id }) as AiNote)
            .sort((a, b) => a.createdAt - b.createdAt),
        ),
      (err) => console.error('[ai] notes watch failed', err),
    );
  }, [uid, day, enabled]);
  return enabled ? notes : [];
}

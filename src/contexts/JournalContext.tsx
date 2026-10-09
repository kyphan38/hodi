'use client';

// ============================================================
// hodi - The whole journal, loaded once per session
//
// One listener for entries, one for reviews, set in (main)/layout so moving
// between Today/Days/Day does not re-subscribe. ~365 docs/year - far below the
// 50k reads/day limit. Today's page does NOT wait for this: it reads its own doc.
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { useUid } from '@/components/AuthGate';
import { getDb } from '@/lib/firebase-client';
import type { Entry, Lesson, Review } from '@/types/hodi';

type Journal = {
  /** Newest first. */
  entries: Entry[];
  reviews: Review[];
  /** Newest first, archived included (views filter). */
  lessons: Lesson[];
  /** Both listeners have their first snapshot. */
  loaded: boolean;
};

const JournalContext = createContext<Journal | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const uid = useUid();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    const db = getDb();
    const onError = (err: unknown) => console.error('[journal] watch failed', err);
    const unsubEntries = onSnapshot(
      collection(db, 'users', uid, 'entries'),
      (snap) => setEntries(snap.docs.map((d) => d.data() as Entry).sort((a, b) => (a.date < b.date ? 1 : -1))),
      onError,
    );
    const unsubReviews = onSnapshot(
      collection(db, 'users', uid, 'reviews'),
      (snap) => setReviews(snap.docs.map((d) => d.data() as Review)),
      onError,
    );
    const unsubLessons = onSnapshot(
      collection(db, 'users', uid, 'lessons'),
      (snap) =>
        setLessons(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<Lesson, 'id'>), id: d.id }))
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      onError,
    );
    return () => {
      unsubEntries();
      unsubReviews();
      unsubLessons();
    };
  }, [uid]);

  const value: Journal = {
    entries: entries ?? [],
    reviews: reviews ?? [],
    lessons,
    loaded: entries !== null && reviews !== null,
  };
  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal(): Journal {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used inside <JournalProvider>.');
  return ctx;
}

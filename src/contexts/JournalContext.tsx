'use client';

// ============================================================
// hodi - Toàn bộ cuốn sổ, nạp một lần cho cả phiên
//
// Một listener cho entries, một cho reviews, đặt ở (main)/layout nên chuyển
// qua lại Today/Days/Day không nghe lại từ đầu. ~365 doc/năm - xa giới hạn
// 50k reads/ngày. Trang hôm nay KHÔNG chờ cái này: nó đọc doc của mình riêng.
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { useUid } from '@/components/AuthGate';
import { getDb } from '@/lib/firebase-client';
import type { Entry, Review } from '@/types/hodi';

type Journal = {
  /** Mới nhất trước. */
  entries: Entry[];
  reviews: Review[];
  /** Cả hai listener đã có snapshot đầu tiên. */
  loaded: boolean;
};

const JournalContext = createContext<Journal | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const uid = useUid();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);

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
    return () => {
      unsubEntries();
      unsubReviews();
    };
  }, [uid]);

  const value: Journal = {
    entries: entries ?? [],
    reviews: reviews ?? [],
    loaded: entries !== null && reviews !== null,
  };
  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal(): Journal {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used inside <JournalProvider>.');
  return ctx;
}

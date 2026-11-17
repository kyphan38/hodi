// ============================================================
// hodi - Read the Insight page data from Firestore
//
// users/{uid}/aiNotes (kind "analysis") and users/{uid}/aiChats/{analysisId}.
// Both are written by Cloud Functions; the client only reads them.
// ============================================================

import { collection, doc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import type { Analysis, Talk } from '@/types/hodi';

/** All analyses, oldest first. Only a few per day, so one listener is fine. */
export function watchAnalyses(uid: string, onData: (list: Analysis[]) => void): Unsubscribe {
  const q = query(collection(getDb(), 'users', uid, 'aiNotes'), where('kind', '==', 'analysis'));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<Analysis, 'id'>), id: d.id }))
          .sort((a, b) => a.createdAt - b.createdAt),
      ),
    (err) => console.error('[ai] analyses watch failed', err),
  );
}

export function watchTalk(uid: string, analysisId: string, onData: (talk: Talk | null) => void): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'users', uid, 'aiChats', analysisId),
    (snap) => onData(snap.exists() ? ({ ...(snap.data() as Omit<Talk, 'id'>), id: snap.id } as Talk) : null),
    (err) => console.error('[ai] talk watch failed', err),
  );
}

/** The kept look back on one year (H4, written by yearSummary), or null. */
export function watchYearSum(uid: string, year: string, onData: (text: string | null) => void): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'users', uid, 'yearSums', year),
    (snap) => onData(snap.exists() ? String(snap.data().text ?? '') : null),
    () => onData(null),
  );
}

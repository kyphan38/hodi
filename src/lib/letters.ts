// ============================================================
// hodi - Letters to the future (H1): users/{uid}/letters/{id}
// Sealed until `openOn`; never deleted (rule #6). Writes are not awaited
// in the UI, like pages: offline they wait in the cache.
// ============================================================

import { addDoc, collection, doc, onSnapshot, updateDoc, type Unsubscribe } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';

export type Letter = { id: string; text: string; openOn: string; createdAt: number; openedAt: number | null };

export function watchLetters(uid: string, onData: (list: Letter[]) => void): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'users', uid, 'letters'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Letter, 'id'>) }))),
    (err) => console.warn('[letters]', err),
  );
}

export function sendLetter(uid: string, text: string, openOn: string): void {
  void addDoc(collection(getDb(), 'users', uid, 'letters'), {
    text: text.normalize('NFC').slice(0, 20_000),
    openOn,
    createdAt: Date.now(),
    openedAt: null,
  }).catch((err) => console.warn('[letters] send', err));
}

export function markOpened(uid: string, id: string): void {
  void updateDoc(doc(getDb(), 'users', uid, 'letters', id), { openedAt: Date.now() }).catch((err) => console.warn('[letters] open', err));
}

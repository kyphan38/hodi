// ============================================================
// hodi - My questions (H3): users/{uid}/questions/{id}
// Mixed into the daily questions. Removing one archives it (rule #6).
// ============================================================

import { addDoc, collection, doc, onSnapshot, updateDoc, type Unsubscribe } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';

export type MyQuestion = { id: string; text: string; archived: boolean; createdAt: number };

export function watchMyQuestions(uid: string, onData: (list: MyQuestion[]) => void): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'users', uid, 'questions'),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<MyQuestion, 'id'>) }))
          .filter((q) => !q.archived)
          .sort((a, b) => a.createdAt - b.createdAt),
      ),
    (err) => console.warn('[questions]', err),
  );
}

export function addMyQuestion(uid: string, text: string): void {
  void addDoc(collection(getDb(), 'users', uid, 'questions'), {
    text: text.normalize('NFC').trim().slice(0, 300),
    archived: false,
    createdAt: Date.now(),
  }).catch((err) => console.warn('[questions] add', err));
}

export function archiveMyQuestion(uid: string, id: string): void {
  void updateDoc(doc(getDb(), 'users', uid, 'questions', id), { archived: true }).catch((err) => console.warn('[questions] archive', err));
}

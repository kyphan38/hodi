// ============================================================
// hodi - Lessons: "next time" steps the user chose to keep
//
// Written from the browser (rules check the shape). AI reads the ones not
// archived as context, so a kept lesson comes back when a similar day happens.
// ============================================================

import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';

export function keepLesson(uid: string, l: { text: string; situation: string; sourceDay: string }) {
  const now = Date.now();
  return addDoc(collection(getDb(), 'users', uid, 'lessons'), {
    text: l.text.slice(0, 2000),
    situation: l.situation.slice(0, 2000),
    sourceDay: l.sourceDay,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateLesson(uid: string, id: string, patch: { text?: string; archived?: boolean }) {
  return updateDoc(doc(getDb(), 'users', uid, 'lessons', id), { ...patch, updatedAt: Date.now() });
}

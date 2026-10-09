// ============================================================
// Search index: users/{uid}/chunks/{day}_{i} with an `embedding` vector.
// Built lazily: `daily` and `search` index pages changed since the last run
// (meta/ai.indexedAt = newest updatedAt done). Chunks are derived data, so
// they are replaced or removed freely (rule #6 is about the user's pages).
// ============================================================

import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';

import { chunkPage, scoreOf } from './chunks.ts';
import { embedTexts } from './embed.ts';

type EntryDoc = { date: string; text: string; updatedAt: number };

export type Hit = { day: string; time: string | null; question: string | null; text: string; score: number };

/** Pages per round: one embedding call and one write batch per round. */
const ROUND = 25;

/**
 * Indexes changed pages, oldest change first, until `budgetMs` runs out.
 * Returns true when nothing is left to index.
 */
export async function syncIndex(user: DocumentReference, apiKey: string, budgetMs: number): Promise<boolean> {
  const start = Date.now();
  const metaRef = user.collection('meta').doc('ai');
  let indexedAt = Number(((await metaRef.get()).data() ?? {}).indexedAt ?? 0);
  while (Date.now() - start < budgetMs) {
    const snap = await user.collection('entries').where('updatedAt', '>', indexedAt).orderBy('updatedAt').limit(ROUND).get();
    if (snap.empty) return true;
    await indexPages(user, apiKey, snap.docs.map((d) => d.data() as EntryDoc));
    indexedAt = Math.max(...snap.docs.map((d) => Number(d.data().updatedAt ?? 0)));
    // Saved per round, so a timeout keeps the work already done.
    await metaRef.set({ indexedAt }, { merge: true });
    if (snap.size < ROUND) return true;
  }
  return false;
}

async function indexPages(user: DocumentReference, apiKey: string, entries: EntryDoc[]): Promise<void> {
  const col = user.collection('chunks');
  const plans = await Promise.all(
    entries.map(async (entry) => {
      const chunks = chunkPage(entry.text);
      const old = await col.where('day', '==', entry.date).get();
      const oldHash = new Map(old.docs.map((d) => [d.id, String(d.data().hash ?? '')]));
      const keep = new Set(chunks.map((c) => `${entry.date}_${c.i}`));
      return {
        day: entry.date,
        fresh: chunks.filter((c) => oldHash.get(`${entry.date}_${c.i}`) !== c.hash),
        stale: old.docs.filter((d) => !keep.has(d.id)).map((d) => d.ref),
      };
    }),
  );
  const fresh = plans.flatMap((p) => p.fresh.map((c) => ({ day: p.day, c })));
  const vectors = fresh.length ? await embedTexts(apiKey, fresh.map((f) => f.c.text)) : [];

  const db = getFirestore();
  // A Firestore batch holds 500 writes.
  const writes: ((b: FirebaseFirestore.WriteBatch) => void)[] = [
    ...plans.flatMap((p) => p.stale.map((ref) => (b: FirebaseFirestore.WriteBatch) => void b.delete(ref))),
    ...fresh.map(({ day, c }, k) => (b: FirebaseFirestore.WriteBatch) =>
      void b.set(col.doc(`${day}_${c.i}`), {
        day,
        i: c.i,
        time: c.time,
        question: c.question,
        text: c.text,
        hash: c.hash,
        embedding: FieldValue.vector(vectors[k]),
        updatedAt: Date.now(),
      }),
    ),
  ];
  for (let s = 0; s < writes.length; s += 450) {
    const batch = db.batch();
    writes.slice(s, s + 450).forEach((w) => w(batch));
    await batch.commit();
  }
}

/** Nearest blocks to a vector, best first. */
export async function nearest(user: DocumentReference, vector: number[], limit: number): Promise<Hit[]> {
  const snap = await user
    .collection('chunks')
    .findNearest({
      vectorField: 'embedding',
      queryVector: vector,
      limit,
      distanceMeasure: 'COSINE',
      distanceResultField: 'distance',
    })
    .get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      day: String(x.day),
      time: (x.time as string | null) ?? null,
      question: (x.question as string | null) ?? null,
      text: String(x.text ?? ''),
      score: scoreOf(Number(x.distance ?? 1)),
    };
  });
}

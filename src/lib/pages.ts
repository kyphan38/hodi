// ============================================================
// hodi - Read/write one page in Firestore
//
// users/{uid}/entries/{YYYY-MM-DD}, users/{uid}/reviews/{period}.
// Writes are not awaited: offline the promise hangs until the network returns,
// but the data is in the local cache at once. "In the cloud" status comes from
// the snapshot's metadata.hasPendingWrites, not from the promise.
// ============================================================

import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import type { PageData, PageKey } from '@/lib/page-data';

function pageRef(uid: string, key: PageKey) {
  return doc(getDb(), 'users', uid, key.col, key.id);
}

export function watchPage(
  uid: string,
  key: PageKey,
  onData: (data: PageData | null, pending: boolean) => void,
): Unsubscribe {
  return onSnapshot(
    pageRef(uid, key),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? (snap.data() as PageData) : null, snap.metadata.hasPendingWrites),
    (err) => console.error('[pages] watch failed', err),
  );
}

export function writePage(uid: string, key: PageKey, data: PageData): void {
  setDoc(pageRef(uid, key), data).catch((err) => {
    // Rejected by rules (wrong email, wrong shape). The text is still in the
    // localStorage draft, so nothing is lost - just log it.
    console.error('[pages] write failed', err);
  });
}

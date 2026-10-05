// ============================================================
// hodi - Đọc/ghi một trang trên Firestore
//
// users/{uid}/entries/{YYYY-MM-DD}, users/{uid}/reviews/{period}.
// Ghi không await: offline thì promise treo tới khi có mạng, nhưng dữ liệu đã
// nằm trong cache trên máy ngay lập tức. Trạng thái "đã lên cloud" đọc từ
// metadata.hasPendingWrites của snapshot, không từ promise.
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
    // Bị rules từ chối (sai email, sai shape). Chữ vẫn còn trong nháp
    // localStorage, nên không mất - chỉ ghi log.
    console.error('[pages] write failed', err);
  });
}

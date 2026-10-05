// ============================================================
// hodi - Nháp dự phòng trong localStorage
//
// Lưới an toàn thứ hai sau cache Firestore (nguyên tắc #4: không bao giờ mất
// chữ). Mỗi lần gõ là ghi nháp ngay, không debounce.
//
// Nó cũng giúp mở app "có chữ ngay": nháp của trang hiện ra trước cả khi
// Firestore kịp đọc cache.
//
// Chỉ giữ nháp của trang đang viết + những nháp CHƯA lên cloud; nháp đã sync
// của trang khác bị dọn mỗi lần ghi. Sign out thì xoá sạch (clearHodiStorage).
// ============================================================

import { readJson, writeJson } from '@/lib/store';

export type Draft = {
  text: string;
  /** epoch ms lần gõ cuối trên máy này. */
  at: number;
  /** true khi Firestore xác nhận text này đã lên server. */
  synced: boolean;
};

const PREFIX = 'hodi.draft.';

export function readDraft(id: string): Draft | null {
  return readJson<Draft>(PREFIX + id);
}

export function writeDraft(id: string, draft: Draft): void {
  writeJson(PREFIX + id, draft);
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX) || k === PREFIX + id) continue;
      if (readJson<Draft>(k)?.synced) localStorage.removeItem(k);
    }
  } catch {
    // bỏ qua
  }
}

export function markDraftSynced(id: string, text: string): void {
  const d = readDraft(id);
  if (d && !d.synced && d.text === text) writeJson(PREFIX + id, { ...d, synced: true });
}

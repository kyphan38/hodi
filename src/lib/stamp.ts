// ============================================================
// hodi - Mốc giờ trong ngày
//
// Viết sáng một ít, tối quay lại viết tiếp: app chèn một dòng "— 21:40" để
// đọc lại thấy được cảm xúc đổi theo giờ. Vẫn là một trang mỗi ngày.
//
// Mốc là chữ thật trong text (export ra vẫn có), chỉ hiện mờ khi đọc.
// File thuần, không DOM.
// ============================================================

import { STAMP_RE, timeLabel } from '@/lib/day';

export { STAMP_RE };

/** Quay lại sau quãng này thì mới chèn mốc. */
export const STAMP_GAP_MS = 60 * 60_000;

/** Có nên chèn mốc ngay trước lần gõ này không. */
export function needsStamp(text: string, lastWriteAt: number | null, now: number): boolean {
  if (!text.trim() || lastWriteAt === null) return false;
  if (now - lastWriteAt < STAMP_GAP_MS) return false;
  // Dòng cuối đã là một mốc (vừa chèn rồi bỏ đi) → không chèn chồng.
  const lastLine = text.trimEnd().split('\n').pop() ?? '';
  return !STAMP_RE.test(lastLine);
}

/** Chuỗi cần chèn vào CUỐI text, kèm đủ dòng trống phía trước. */
export function stampInsert(text: string, now: number): string {
  const lead = text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  return `${lead}— ${timeLabel(now)}\n`;
}

// ============================================================
// hodi - Dựng dữ liệu một "trang" (một ngày, hoặc một review)
//
// File thuần: không Firestore, không DOM - test được bằng node:test.
// Entry và Review cùng là "một trang chữ", chung một editor và một hook lưu.
// ============================================================

import { countWords, isDayId, monthDay } from '@/lib/day';
import type { Entry, Review } from '@/types/hodi';

export type PageKey = { col: 'entries'; id: string } | { col: 'reviews'; id: string };

export type PageData = Entry | Review;

export const WEEK_RE = /^\d{4}-W\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;

export function entryKey(date: string): PageKey {
  return { col: 'entries', id: date };
}

export function reviewKey(period: string): PageKey {
  return { col: 'reviews', id: period };
}

export function isValidKey(key: PageKey): boolean {
  return key.col === 'entries' ? isDayId(key.id) : WEEK_RE.test(key.id) || MONTH_RE.test(key.id);
}

export function keyId(key: PageKey): string {
  return `${key.col}/${key.id}`;
}

/**
 * Gộp hai bản khi cả máy này lẫn nơi khác cùng sửa một trang (vd: gõ offline
 * trên Mac trong lúc iPhone đã viết thêm). Không bao giờ bỏ chữ của bên nào:
 * bản này chứa bản kia thì lấy bản dài, không thì nối bản trên server trước.
 */
export function mergeTexts(remote: string, local: string): string {
  const r = remote.trim();
  const l = local.trim();
  if (!l || r.includes(l)) return remote;
  if (!r || l.includes(r)) return local;
  return `${remote.trimEnd()}\n\n${local.trimStart()}`;
}

/**
 * Dữ liệu ghi vào Firestore. `prev` là doc hiện có (null nếu chưa có).
 * createdAt và prompt chỉ đặt một lần, lúc trang ra đời.
 */
export function buildPage(
  key: PageKey,
  text: string,
  prev: PageData | null,
  prompt: string | null,
  now: number,
): PageData {
  const createdAt = prev?.createdAt ?? now;
  const words = countWords(text);
  if (key.col === 'entries') {
    return {
      date: key.id,
      md: monthDay(key.id),
      text,
      words,
      prompt: (prev as Entry | null)?.prompt ?? prompt,
      createdAt,
      updatedAt: now,
    };
  }
  return {
    kind: WEEK_RE.test(key.id) ? 'week' : 'month',
    period: key.id,
    text,
    words,
    createdAt,
    updatedAt: now,
  };
}

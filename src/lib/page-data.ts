// ============================================================
// hodi - Build the data for one "page" (a day, or a review)
//
// Pure file: no Firestore, no DOM - testable with node:test.
// Entry and Review are both "one text page", sharing one editor and one save hook.
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
 * Merges two versions when this device and another edited the same page (e.g.
 * typing offline on the Mac while the iPhone added more). Never drops either
 * side's text: if one contains the other, take the longer; else server first.
 */
export function mergeTexts(remote: string, local: string): string {
  const r = remote.trim();
  const l = local.trim();
  if (!l || r.includes(l)) return remote;
  if (!r || l.includes(r)) return local;
  return `${remote.trimEnd()}\n\n${local.trimStart()}`;
}

/**
 * Data written to Firestore. `prev` is the existing doc (null if none).
 * createdAt and prompt are set once, when the page is created.
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

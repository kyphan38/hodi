import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bookMonths, bookYears } from '@/lib/book';
import type { Entry, Review } from '@/types/hodi';

const e = (date: string, words = 3): Entry => ({ date, md: date.slice(5), text: 'x', words, prompt: null, createdAt: 0, updatedAt: 0 });
const r = (kind: Review['kind'], period: string): Review => ({ kind, period, text: 'r', words: 2, createdAt: 0, updatedAt: 0 });

test('book: years with writing, months with pages and reviews, the year review last', () => {
  const entries = [e('2026-03-02'), e('2026-03-01'), e('2026-05-10', 0), e('2025-12-31')];
  const reviews = [r('month', '2026-03'), r('week', '2026-W09'), r('year', '2026'), r('month', '2025-12')];
  assert.deepEqual(bookYears(entries), ['2026', '2025']);
  const b = bookMonths('2026', entries, reviews);
  assert.deepEqual(b.months.map((m) => m.month), ['2026-03']);
  assert.deepEqual(b.months[0].entries.map((x) => x.date), ['2026-03-01', '2026-03-02']);
  assert.deepEqual(b.months[0].reviews.map((x) => x.period), ['2026-W09', '2026-03']);
  assert.equal(b.yearReview?.period, '2026');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countWords } from '@/lib/day';
import { buildMarkdown, exportFilename } from '@/lib/export';
import { periodDays, reviewInvites, reviewKind, reviewTitle } from '@/lib/review';
import type { Entry, Review } from '@/types/hodi';

const kinds = (today: string) => reviewInvites(today).map((r) => `${r.kind}:${r.period}`);

test('lời mời review: Chủ nhật tuần này, thứ Hai tuần trước', () => {
  assert.deepEqual(kinds('2026-10-04'), ['week:2026-W40']); // CN
  assert.deepEqual(kinds('2026-10-05'), ['week:2026-W40']); // T2
  assert.deepEqual(kinds('2026-10-07'), []); // T4
});

test('lời mời review: cuối tháng và hai ngày đầu tháng', () => {
  assert.deepEqual(kinds('2026-10-31'), ['month:2026-10']); // T7
  assert.deepEqual(kinds('2026-11-01'), ['week:2026-W44', 'month:2026-10']); // CN, ngày 1
  assert.deepEqual(kinds('2026-11-02'), ['week:2026-W44', 'month:2026-10']); // T2, ngày 2
  assert.deepEqual(kinds('2026-11-03'), []);
  assert.deepEqual(kinds('2027-01-01'), ['month:2026-12']);
});

test('ngày trong kỳ review', () => {
  assert.deepEqual(periodDays('2026-W40'), [
    '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  ]);
  assert.equal(periodDays('2026-02').length, 28);
  assert.equal(reviewKind('2026-W40'), 'week');
  assert.equal(reviewKind('2026-10'), 'month');
  assert.equal(reviewKind('nope'), null);
  assert.equal(reviewTitle('2026-W40'), 'Week of 28 Sep');
  assert.equal(reviewTitle('2026-10'), 'October 2026');
});

const entry = (date: string, text: string, prompt: string | null = null): Entry => ({
  date, md: date.slice(5), text, words: countWords(text), prompt, createdAt: 0, updatedAt: 0,
});

test('export Markdown: cũ nhất trước, review sau ngày cuối kỳ, bỏ trang rỗng', () => {
  const review: Review = { kind: 'week', period: '2026-W40', text: 'Tuần ổn.', words: 2, createdAt: 0, updatedAt: 0 };
  const md = buildMarkdown(
    [entry('2026-10-05', 'Hôm nay.'), entry('2026-10-04', 'Chủ nhật.', 'What made you smile?'), entry('2026-10-03', '  ')],
    [review],
    '2026-10-05',
  );
  assert.equal(
    md,
    [
      '# hodi\n\nExported Mon, 5 Oct 2026 · 3 pages\n',
      '## Sun, 4 Oct 2026\n\n*What made you smile?*\n\nChủ nhật.\n',
      '## Review, Week of 28 Sep 2026\n\nTuần ổn.\n',
      '## Mon, 5 Oct 2026\n\nHôm nay.\n',
    ].join('\n'),
  );
  assert.equal(exportFilename('2026-10-05'), 'hodi-2026-10-05.md');
  // Câu hỏi đã nằm trong trang thì không in lại ở dạng *nghiêng*.
  const inline = buildMarkdown([entry('2026-10-04', '› Q?\nTrả lời.', 'Q?')], [], '2026-10-05');
  assert.ok(inline.includes('## Sun, 4 Oct 2026\n\n› Q?\nTrả lời.\n'));
  assert.ok(!inline.includes('*Q?*'));
});

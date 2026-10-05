import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPage, entryKey, isValidKey, mergeTexts, reviewKey } from '@/lib/page-data';
import type { Entry } from '@/types/hodi';

test('gộp: bản này chứa bản kia thì lấy bản dài hơn', () => {
  assert.equal(mergeTexts('sáng ổn', 'sáng ổn. tối mệt'), 'sáng ổn. tối mệt');
  assert.equal(mergeTexts('sáng ổn. tối mệt', 'sáng ổn'), 'sáng ổn. tối mệt');
  assert.equal(mergeTexts('', 'mới viết'), 'mới viết');
  assert.equal(mergeTexts('trên server', ''), 'trên server');
});

test('gộp: hai bản khác nhau thì giữ cả hai, server trước', () => {
  assert.equal(mergeTexts('viết trên iPhone\n', '\nviết trên Mac'), 'viết trên iPhone\n\nviết trên Mac');
});

test('entry mới: createdAt = updatedAt, prompt được ghi', () => {
  const e = buildPage(entryKey('2026-10-05'), 'Hôm nay ổn.', null, 'What made you smile?', 100) as Entry;
  assert.deepEqual(e, {
    date: '2026-10-05',
    md: '10-05',
    text: 'Hôm nay ổn.',
    words: 3,
    prompt: 'What made you smile?',
    createdAt: 100,
    updatedAt: 100,
  });
});

test('entry cũ: giữ createdAt và prompt lúc ra đời', () => {
  const prev = buildPage(entryKey('2026-10-05'), 'a', null, 'Q1', 100);
  const next = buildPage(entryKey('2026-10-05'), 'a b', prev, 'Q2', 200) as Entry;
  assert.equal(next.createdAt, 100);
  assert.equal(next.updatedAt, 200);
  assert.equal(next.prompt, 'Q1');
});

test('review tuần/tháng nhận đúng kind', () => {
  assert.equal((buildPage(reviewKey('2026-W41'), 'x', null, null, 1) as { kind: string }).kind, 'week');
  assert.equal((buildPage(reviewKey('2026-10'), 'x', null, null, 1) as { kind: string }).kind, 'month');
});

test('khoá hợp lệ', () => {
  assert.equal(isValidKey(entryKey('2026-10-05')), true);
  assert.equal(isValidKey(entryKey('2026-13-01')), false);
  assert.equal(isValidKey(reviewKey('2026-W41')), true);
  assert.equal(isValidKey(reviewKey('2026-W4')), false);
});

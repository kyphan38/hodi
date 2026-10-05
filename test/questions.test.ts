import { test } from 'node:test';
import assert from 'node:assert/strict';

import { QUESTIONS, askedIn, nextQuestion, questionFor } from '@/lib/questions';

test('câu hỏi cố định theo ngày, "another" đổi câu', () => {
  assert.equal(questionFor('2026-10-05'), questionFor('2026-10-05'));
  assert.notEqual(questionFor('2026-10-05', 0), questionFor('2026-10-05', 1));
  assert.ok(QUESTIONS.includes(questionFor('2026-10-05', 12345)));
  assert.ok(QUESTIONS.every((q) => q.length <= 300));
});

test('câu tiếp theo bỏ qua câu đã trả lời hôm nay', () => {
  const day = '2026-10-05';
  const first = questionFor(day, 1);
  const next = nextQuestion(day, new Set([first]), 1);
  assert.notEqual(next.question, first);
  assert.equal(next.skip, 2);
  assert.equal(nextQuestion(day, new Set(), 1).question, first);
});

test('đọc các câu hỏi có trong một trang', () => {
  assert.deepEqual([...askedIn('· 08:10\n› Q1?\nabc\n\n· 09:00\n› Q2?\n')], ['Q1?', 'Q2?']);
});

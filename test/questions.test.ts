import { test } from 'node:test';
import assert from 'node:assert/strict';

import { QUESTIONS, askedIn, nextQuestion, questionFor } from '@/lib/questions';

test('the question is fixed per day, "another" changes it', () => {
  assert.equal(questionFor('2026-10-05'), questionFor('2026-10-05'));
  assert.notEqual(questionFor('2026-10-05', 0), questionFor('2026-10-05', 1));
  assert.ok(QUESTIONS.includes(questionFor('2026-10-05', 12345)));
  assert.ok(QUESTIONS.every((q) => q.length <= 300));
});

test('the next question skips ones answered today', () => {
  const day = '2026-10-05';
  const first = questionFor(day, 1);
  const next = nextQuestion(day, new Set([first]), 1);
  assert.notEqual(next.question, first);
  assert.equal(next.skip, 2);
  assert.equal(nextQuestion(day, new Set(), 1).question, first);
});

test('reads the questions in a page', () => {
  assert.deepEqual([...askedIn('· 08:10\n› Q1?\nabc\n\n· 09:00\n› Q2?\n')], ['Q1?', 'Q2?']);
});

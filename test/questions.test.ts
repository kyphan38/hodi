import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AI_MAX, BY_TOPIC, QUESTIONS, TOPICS, aiCandidates, askedIn, nextQuestion, questionFor } from '@/lib/questions';

test('the question is fixed per day, "another" changes it', () => {
  assert.equal(questionFor('2026-10-05'), questionFor('2026-10-05'));
  assert.notEqual(questionFor('2026-10-05', 0), questionFor('2026-10-05', 1));
  assert.ok(QUESTIONS.includes(questionFor('2026-10-05', 12345)));
  assert.ok(QUESTIONS.every((q) => q.length <= 300));
});

test('the list has no repeats', () => {
  assert.equal(new Set(QUESTIONS).size, QUESTIONS.length);
});

test('AI gets at most 200 questions, the same set all day', () => {
  const a = aiCandidates('2026-10-05');
  assert.equal(a.length, Math.min(QUESTIONS.length, AI_MAX));
  assert.equal(new Set(a).size, a.length);
  assert.deepEqual(aiCandidates('2026-10-05'), a);
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

test('AI picks come first in order, then the usual questions', () => {
  const day = '2026-10-05';
  const picks = ['Did you call mom?', QUESTIONS[3]];
  assert.deepEqual(nextQuestion(day, new Set(), 0, picks), { question: picks[0], skip: 0 });
  assert.deepEqual(nextQuestion(day, new Set(), 1, picks), { question: picks[1], skip: 1 });
  assert.deepEqual(nextQuestion(day, new Set([picks[0]]), 0, picks), { question: picks[1], skip: 1 });
  assert.equal(nextQuestion(day, new Set(), 2, picks).question, questionFor(day, 0));
});

const topicOf = (q: string) => TOPICS.find((t) => BY_TOPIC[t].includes(q));

test('"another" never asks about the same topic twice in a row', () => {
  for (const day of ['2026-11-15', '2026-11-16', '2027-01-01']) {
    for (let skip = 0; skip < 60; skip++) {
      assert.notEqual(topicOf(questionFor(day, skip)), topicOf(questionFor(day, skip + 1)), `${day} skip ${skip}`);
    }
  }
});

test('a chosen topic only asks from that topic, and skips what was answered', () => {
  const day = '2026-11-16';
  for (const t of TOPICS) {
    for (let skip = 0; skip < 10; skip++) assert.equal(topicOf(questionFor(day, skip, t)), t);
  }
  const first = nextQuestion(day, new Set(), 0, ['AI pick'], 'work');
  assert.equal(topicOf(first.question), 'work', 'a chosen topic replaces the AI picks');
  const next = nextQuestion(day, new Set([first.question]), 0, [], 'work');
  assert.notEqual(next.question, first.question);
  assert.equal(topicOf(next.question), 'work');
});

test('every question has exactly one of the 7 topics', () => {
  assert.equal(TOPICS.length, 7);
  assert.equal(TOPICS.reduce((n, t) => n + BY_TOPIC[t].length, 0), QUESTIONS.length);
  assert.ok(QUESTIONS.every((q) => topicOf(q)));
});

test('my questions (H3): a topic of their own, and one turn in the mix', () => {
  const mine = ['What did I avoid today?', 'Who made me smile?'];
  assert.ok(mine.includes(questionFor('2026-11-17', 0, 'mine', mine)));
  assert.notEqual(questionFor('2026-11-17', 0, 'mine', mine), questionFor('2026-11-17', 1, 'mine', mine));
  // Over 8 steps (7 topics + mine) one of them is the user's.
  const eight = Array.from({ length: 8 }, (_, i) => questionFor('2026-11-17', i, null, mine));
  assert.equal(eight.filter((q) => mine.includes(q)).length, 1);
  // No questions of your own: the usual rotation.
  assert.equal(questionFor('2026-11-17', 3, null, []), questionFor('2026-11-17', 3));
  // "mine" with nothing saved falls back to the mix.
  assert.ok(QUESTIONS.includes(questionFor('2026-11-17', 0, 'mine', [])));
  const next = nextQuestion('2026-11-17', new Set([mine[0], mine[1]]), 0, [], 'mine', mine);
  assert.ok(mine.includes(next.question));
});

test('aiCandidates puts my questions first and stays within the cap', () => {
  const mine = ['Mine 1', 'Mine 2'];
  const a = aiCandidates('2026-11-17', mine);
  assert.deepEqual(a.slice(0, 2), mine);
  assert.ok(a.length <= AI_MAX);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CONTEXT_MAX_CHARS, formatLessons, formatPast } from '../functions/src/context.ts';
import { addDaysId } from '../functions/src/dates.ts';
import {
  buildNextTimePrompt,
  buildReflectPrompt,
  checkBlock,
  parseNextTime,
  parseReflect,
} from '../functions/src/prompts.ts';

const block = { day: '2026-10-09', time: '21:40', question: null, body: 'I snapped at my brother.' };

test('addDaysId crosses months and years', () => {
  assert.equal(addDaysId('2026-10-09', -60), '2026-08-10');
  assert.equal(addDaysId('2026-01-01', -1), '2025-12-31');
});

test('formatPast is newest first, skips empty pages, respects the cap', () => {
  const out = formatPast([
    { date: '2026-10-01', text: 'old' },
    { date: '2026-10-08', text: 'new' },
    { date: '2026-10-05', text: '   ' },
  ]);
  assert.equal(out, '### 2026-10-08\nnew\n\n### 2026-10-01\nold');
  const big = formatPast([
    { date: '2026-10-08', text: 'a'.repeat(CONTEXT_MAX_CHARS - 100) },
    { date: '2026-10-07', text: 'b'.repeat(500) },
  ]);
  assert.ok(!big.includes('2026-10-07'));
});

test('formatLessons lists day, text and situation', () => {
  assert.equal(
    formatLessons([{ text: 'Walk first.', situation: 'Angry at work', sourceDay: '2026-09-12' }]),
    '- (2026-09-12) Walk first. [when: Angry at work]',
  );
});

test('prompts carry the language rule and the block', () => {
  const vi = buildReflectPrompt(block, '', '', 'vi');
  assert.match(vi, /Vietnamese/);
  assert.match(vi, /I snapped at my brother/);
  assert.match(buildNextTimePrompt(block, '', '', 'en'), /plain English/);
});

test('parseReflect keeps at most 3 steps and needs a mirror', () => {
  const r = parseReflect(JSON.stringify({ mirror: ' Tired. ', question: 'Why?', steps: ['a', 'b', 'c', 'd', ''] }));
  assert.deepEqual(r, { mirror: 'Tired.', question: 'Why?', steps: ['a', 'b', 'c'] });
  assert.throws(() => parseReflect(JSON.stringify({ mirror: '', question: 'q', steps: [] })));
});

test('parseNextTime drops made-up days', () => {
  const r = parseNextTime(
    JSON.stringify({
      happened: 'You shouted.',
      didWell: '',
      steps: ['Pause ten seconds.'],
      helpedBefore: [
        { day: '2026-09-12', text: 'A walk helped.' },
        { day: '2020-01-01', text: 'Invented.' },
      ],
    }),
    new Set(['2026-09-12']),
  );
  assert.equal(r.didWell, null);
  assert.deepEqual(r.helpedBefore, [{ day: '2026-09-12', text: 'A walk helped.' }]);
});

test('checkBlock refuses bad input', () => {
  assert.deepEqual(checkBlock(block), block);
  assert.throws(() => checkBlock({ ...block, day: 'today' }));
  assert.throws(() => checkBlock({ ...block, body: '  ' }));
  assert.throws(() => checkBlock({ ...block, body: 'x'.repeat(9000) }));
  assert.equal(checkBlock({ ...block, time: 'soon' }).time, null);
});

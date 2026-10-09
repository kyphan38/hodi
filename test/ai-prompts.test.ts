import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CONTEXT_MAX_CHARS, formatLessons, formatPast } from '../functions/src/context.ts';
import { addDaysId, periodRange } from '../functions/src/dates.ts';
import { periodDays } from '@/lib/review';
import {
  buildDeeperPrompt,
  buildLookBackPrompt,
  buildPickPrompt,
  checkCandidates,
  parseDeeper,
  parsePick,
  buildNextTimePrompt,
  buildReflectPrompt,
  checkBlock,
  parseLookBack,
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

test('formatPast can put the oldest page first', () => {
  const out = formatPast(
    [
      { date: '2026-10-08', text: 'new' },
      { date: '2026-10-01', text: 'old' },
    ],
    'oldest',
  );
  assert.equal(out, '### 2026-10-01\nold\n\n### 2026-10-08\nnew');
});

test('periodRange matches the app review periods', () => {
  for (const p of ['2026-W01', '2026-W40', '2026-W53', '2020-W53', '2026-02', '2024-02', '2026-12']) {
    const days = periodDays(p);
    assert.deepEqual(periodRange(p), [days[0], days[days.length - 1]], p);
  }
  assert.equal(periodRange('2026-13'), null);
  assert.equal(periodRange('2026-W00'), null);
  assert.equal(periodRange('soon'), null);
});

test('parseLookBack keeps real days only and needs a pattern', () => {
  const r = parseLookBack(
    JSON.stringify({
      patterns: [
        { text: 'Tired after meetings.', days: ['2026-10-07', '2026-10-05', '2026-10-05', '1999-01-01'] },
        { text: '', days: [] },
      ],
      question: 'What would make next week lighter?',
    }),
    new Set(['2026-10-05', '2026-10-07']),
  );
  assert.deepEqual(r.patterns, [{ text: 'Tired after meetings.', days: ['2026-10-05', '2026-10-07'] }]);
  assert.throws(() => parseLookBack(JSON.stringify({ patterns: [], question: 'q' }), new Set()));
});

test('look back prompt names the period and the language', () => {
  const p = buildLookBackPrompt('the month 2026-10', '### 2026-10-01\nhi', '', 'vi');
  assert.match(p, /the month 2026-10/);
  assert.match(p, /Vietnamese/);
});

test('deeper prompt has the block; parseDeeper cleans one line', () => {
  assert.match(buildDeeperPrompt(block, 'vi'), /I snapped at my brother/);
  assert.equal(parseDeeper(JSON.stringify({ question: ' What did you\n need then? ' })), 'What did you need then?');
  assert.throws(() => parseDeeper(JSON.stringify({ question: '' })));
});

test('pick prompt numbers the list; parsePick needs a valid index', () => {
  const list = ['A?', 'B?', 'C?'];
  assert.match(buildPickPrompt('### 2026-10-08\nhi', list), /1\. B\?/);
  assert.equal(parsePick(JSON.stringify({ index: 2 }), list), 'C?');
  assert.throws(() => parsePick(JSON.stringify({ index: 3 }), list));
  assert.throws(() => parsePick(JSON.stringify({ index: 1.5 }), list));
});

test('checkCandidates drops junk and refuses empty lists', () => {
  assert.deepEqual(checkCandidates(['A?', '', 3, 'B?']), ['A?', 'B?']);
  assert.throws(() => checkCandidates([]));
  assert.throws(() => checkCandidates('A?'));
});

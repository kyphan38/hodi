import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseBlocks } from '@/lib/blocks';
import { chunkPage, hashText, scoreOf } from '../functions/src/chunks.ts';
import { CONTEXT_MAX_CHARS, formatLessons, formatPast } from '../functions/src/context.ts';
import { addDaysId, periodRange } from '../functions/src/dates.ts';
import { periodDays } from '@/lib/review';
import {
  buildDeeperPrompt,
  buildIntentionsPrompt,
  buildLookBackPrompt,
  buildPickPrompt,
  buildStoryPrompt,
  buildThenNowPrompt,
  checkCandidates,
  parseDeeper,
  parseIntentions,
  parsePick,
  parseStory,
  parseThenNow,
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

test('intentions prompt lists open promises and the language', () => {
  const p = buildIntentionsPrompt('### 2026-10-08\nhi', ['Call mom'], 'vi');
  assert.match(p, /- Call mom/);
  assert.match(p, /Vietnamese/);
});

test('parseIntentions keeps real days and fixes a bad askOn', () => {
  const known = new Set(['2026-10-08']);
  const out = parseIntentions(
    JSON.stringify({
      intentions: [
        { day: '2026-10-08', text: 'Go home', askOn: '2026-10-31', question: 'Did you  go home?' },
        { day: '2026-10-08', text: 'Run', askOn: '2026-10-01', question: 'Did you run?' },
        { day: '2026-10-08', text: 'Read', askOn: 'soon', question: 'Did you read?' },
        { day: '1999-01-01', text: 'Fake', askOn: '1999-01-04', question: 'Fake?' },
        { day: '2026-10-08', text: '', askOn: '2026-10-11', question: 'Empty?' },
      ],
    }),
    known,
    addDaysId,
  );
  assert.deepEqual(out, [
    { day: '2026-10-08', text: 'Go home', askOn: '2026-10-31', question: 'Did you go home?' },
    { day: '2026-10-08', text: 'Run', askOn: '2026-10-11', question: 'Did you run?' },
    { day: '2026-10-08', text: 'Read', askOn: '2026-10-11', question: 'Did you read?' },
  ]);
  assert.deepEqual(parseIntentions(JSON.stringify({ intentions: 'x' }), known, addDaysId), []);
});

test('parseStory keeps real evidence days and needs a story and a kinder line', () => {
  const r = parseStory(
    JSON.stringify({
      story: 'I always fail.',
      against: [
        { day: '2026-10-07', text: 'You called mom.' },
        { day: '2001-01-01', text: 'Invented.' },
      ],
      kinder: 'Some days go badly; not all of them.',
      question: 'What went fine this week?',
    }),
    new Set(['2026-10-07']),
  );
  assert.deepEqual(r.against, [{ day: '2026-10-07', text: 'You called mom.' }]);
  assert.throws(() => parseStory(JSON.stringify({ story: 'x', against: [], kinder: '', question: '' }), new Set()));
  assert.match(buildStoryPrompt(block, '', '', 'en'), /CHECK THE STORY/);
});

test('parseThenNow turns an empty now into null', () => {
  assert.deepEqual(parseThenNow(JSON.stringify({ then: 'Moving house.', now: '', question: 'How is it?' })), {
    then: 'Moving house.',
    now: null,
    question: 'How is it?',
  });
  assert.throws(() => parseThenNow(JSON.stringify({ then: '', now: null, question: '' })));
  assert.match(buildThenNowPrompt('2026-10-09', '2025-10-09', 'Moving.', '', 'vi'), /Page from 2025-10-09/);
});

test('chunkPage splits like the app blocks and skips empty ones', () => {
  const text = '· 08:10\n› What drained you?\nLong meeting.\n\n· 12:00\n\n\n· 21:40\nA good coffee.\n\nSecond paragraph.';
  const app = parseBlocks(text);
  const chunks = chunkPage(text);
  assert.deepEqual(
    chunks.map((c) => c.i),
    app.map((b, i) => (b.body.trim() ? i : -1)).filter((i) => i >= 0),
  );
  assert.deepEqual(chunks[0], {
    i: 0,
    time: '08:10',
    question: 'What drained you?',
    text: 'What drained you?\nLong meeting.',
    hash: hashText('What drained you?\nLong meeting.'),
  });
  assert.equal(chunks[1].text, 'A good coffee.\n\nSecond paragraph.');
  assert.deepEqual(chunkPage('   '), []);
});

test('old text without time marks is one chunk', () => {
  const c = chunkPage('Just some words.\nMore.');
  assert.equal(c.length, 1);
  assert.equal(c[0].time, null);
});

test('hashText is stable and changes with the text; scoreOf clamps', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
  assert.equal(scoreOf(0.2), 0.8);
  assert.equal(scoreOf(1.7), 0);
});

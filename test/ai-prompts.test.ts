import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseBlocks } from '@/lib/blocks';
import { chunkPage, hashText, scoreOf } from '../functions/src/chunks.ts';
import { CONTEXT_MAX_CHARS, formatLessons, formatPast } from '../functions/src/context.ts';
import { addDaysId, parseRange, rangeDays } from '../functions/src/dates.ts';
import {
  buildAnalyzePrompt,
  buildIntentionsPrompt,
  buildPickPrompt,
  checkCandidates,
  parseAnalysis,
  parseIntentions,
  parsePick,
} from '../functions/src/prompts.ts';

test('addDaysId crosses months and years', () => {
  assert.equal(addDaysId('2026-10-09', -60), '2026-08-10');
  assert.equal(addDaysId('2026-01-01', -1), '2025-12-31');
});

test('rangeDays ends today and counts today', () => {
  assert.deepEqual(rangeDays('today', '2026-10-09'), ['2026-10-09', '2026-10-09']);
  assert.deepEqual(rangeDays('3d', '2026-10-09'), ['2026-10-07', '2026-10-09']);
  assert.deepEqual(rangeDays('7d', '2026-10-02'), ['2026-09-26', '2026-10-02']);
  assert.deepEqual(rangeDays('30d', '2026-10-09'), ['2026-09-10', '2026-10-09']);
  assert.equal(parseRange('7d'), '7d');
  assert.equal(parseRange('365d'), null);
  assert.equal(parseRange(undefined), null);
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

test('formatLessons lists day, text and situation', () => {
  assert.equal(
    formatLessons([{ text: 'Walk first.', situation: 'Angry at work', sourceDay: '2026-09-12' }]),
    '0. (2026-09-12) Walk first. [when: Angry at work]',
  );
});

test('analyze prompt has the range, the pages, older moments and the language', () => {
  const p = buildAnalyzePrompt('the days 2026-10-07 to 2026-10-09', '### 2026-10-08\nhi', '### 2026-09-01\nold', '', 'vi');
  assert.match(p, /ANALYZE the days 2026-10-07 to 2026-10-09/);
  assert.match(p, /### 2026-10-08\nhi/);
  assert.match(p, /Related moments from older pages:\n### 2026-09-01/);
  assert.match(p, /Vietnamese/);
  assert.match(buildAnalyzePrompt('the day 2026-10-09', 'x', '', '', 'en'), /older pages: none/);
  assert.match(p, /NOT already in "gives" or "takes"/);
  assert.match(p, /The first step is about the thing that took the most energy/);
});

test('parseAnalysis keeps real days, drops guesses, caps lists', () => {
  const known = new Set(['2026-10-08', '2026-10-09', '2026-09-01']);
  const r = parseAnalysis(
    JSON.stringify({
      overview: ' A tiring week. ',
      gives: [{ text: 'Walks', days: ['2026-10-09', '2026-10-08', '2026-10-08', '1999-01-01'] }],
      takes: [{ text: '', days: [] }],
      patterns: [1, 2, 3, 4].map((n) => ({ text: `p${n}`, days: [] })),
      wins: [],
      story: { story: 'I always fail.', against: [{ text: 'Called mom', days: ['2026-10-08'] }, { text: 'Made up', days: [] }], truer: 'Some days go badly.' },
      steps: ['a', 'b', 'c', 'd'],
      helpedBefore: [
        { text: 'A walk helped', days: ['2026-09-01'] },
        { text: 'Guess', days: ['2020-01-01'] },
      ],
      question: 'What next?',
    }),
    known,
  );
  assert.equal(r.overview, 'A tiring week.');
  assert.deepEqual(r.gives, [{ text: 'Walks', days: ['2026-10-08', '2026-10-09'] }]);
  assert.deepEqual(r.takes, []);
  assert.equal(r.patterns.length, 3);
  assert.deepEqual(r.story?.against, [{ text: 'Called mom', days: ['2026-10-08'] }]);
  assert.deepEqual(r.steps, ['a', 'b', 'c']);
  assert.deepEqual(r.helpedBefore, [{ text: 'A walk helped', days: ['2026-09-01'] }]);
});

test('parseAnalysis maps lessons in action to real lessons and range days', () => {
  const base = { overview: 'ok', gives: [], takes: [], patterns: [], wins: [], story: null, steps: [], helpedBefore: [], question: '' };
  const inRange = new Set(['2026-10-08', '2026-10-09']);
  const known = new Set([...inRange, '2026-09-01']);
  const r = parseAnalysis(
    JSON.stringify({
      ...base,
      lessonsInAction: [
        { lesson: 1, used: true, text: 'Wrote notes before the meeting.', days: ['2026-10-09'] },
        { lesson: 0, used: false, text: 'Snapped again.', days: ['2026-10-08', '2026-09-01'] },
        { lesson: 5, used: true, text: 'No such lesson.', days: ['2026-10-09'] },
        { lesson: 0, used: true, text: 'Outside the range.', days: ['2026-09-01'] },
        { lesson: 0, used: 'yes', text: 'Bad flag.', days: ['2026-10-09'] },
      ],
    }),
    known,
    ['Talk in private.', 'Write two points first.'],
    inRange,
  );
  assert.deepEqual(r.lessonsInAction, [
    { lesson: 'Write two points first.', used: true, text: 'Wrote notes before the meeting.', days: ['2026-10-09'] },
    { lesson: 'Talk in private.', used: false, text: 'Snapped again.', days: ['2026-10-08'] },
  ]);
  assert.deepEqual(parseAnalysis(JSON.stringify(base), known).lessonsInAction, []);
});

test('parseAnalysis keeps the newest 4 days of an item', () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];
  const base = { overview: 'ok', takes: [], patterns: [], wins: [], story: null, steps: [], helpedBefore: [], question: '' };
  const r = parseAnalysis(JSON.stringify({ ...base, gives: [{ text: 'Walks', days }] }), new Set(days));
  assert.deepEqual(r.gives[0].days, days.slice(-4));
});

test('parseAnalysis: no story is null, empty overview throws', () => {
  const base = { gives: [], takes: [], patterns: [], wins: [], steps: [], helpedBefore: [], question: '' };
  assert.equal(parseAnalysis(JSON.stringify({ ...base, overview: 'ok', story: null }), new Set()).story, null);
  assert.equal(parseAnalysis(JSON.stringify({ ...base, overview: 'ok', story: { story: 'x', against: [], truer: '' } }), new Set()).story, null);
  assert.throws(() => parseAnalysis(JSON.stringify({ ...base, overview: '', story: null }), new Set()));
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

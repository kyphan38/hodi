import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bestLesson,
  buildThemePrompt,
  buildYearPrompt,
  checkBlock,
  checkTheme,
  checkVoice,
  checkYear,
  cosine,
  parseVoice,
  themeBlocks,
  VOICE_PROMPT,
} from '../functions/src/more-prompts.ts';

test('voice: checks the audio, keeps the words, never translates', () => {
  assert.deepEqual(checkVoice({ audio: 'AAAA', mimeType: 'audio/webm;codecs=opus' }), { audio: 'AAAA', mimeType: 'audio/webm' });
  assert.throws(() => checkVoice({ audio: '', mimeType: 'audio/webm' }));
  assert.throws(() => checkVoice({ audio: 'AAAA', mimeType: 'video/mp4' }));
  assert.ok(VOICE_PROMPT.includes('Do not fix, translate'));
  assert.equal(parseVoice('{"text":" Hôm nay mệt. "}'), 'Hôm nay mệt.');
  assert.equal(parseVoice('broken'), '');
});

test('year: a real past or current year only, prompt in the reply language', () => {
  const now = Date.UTC(2026, 10, 17);
  assert.equal(checkYear('2026', now), '2026');
  assert.throws(() => checkYear('2027', now));
  assert.throws(() => checkYear('26', now));
  assert.ok(buildYearPrompt('2026', 'x', 'vi').includes('Vietnamese'));
  assert.ok(buildYearPrompt('2026', 'x', 'en').includes('English'));
});

test('theme: blocks close enough, oldest first; prompt lists them with dates', () => {
  assert.equal(checkTheme('  work '), 'work');
  assert.throws(() => checkTheme(' '));
  const hits = [
    { day: '2026-11-02', text: 'b', score: 0.7 },
    { day: '2026-10-01', text: 'a', score: 0.6 },
    { day: '2026-09-01', text: 'far', score: 0.3 },
  ];
  assert.deepEqual(themeBlocks(hits).map((h) => h.day), ['2026-10-01', '2026-11-02']);
  assert.ok(buildThemePrompt('work', themeBlocks(hits), 'en').includes('[2026-10-01] a'));
});

test('lesson: cosine, only a close lesson, blocks too short are skipped', () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(bestLesson([1, 0], [{ item: 'far', vector: [0, 1] }]), null);
  assert.equal(bestLesson([1, 0], [{ item: 'far', vector: [0, 1] }, { item: 'near', vector: [0.9, 0.1] }]), 'near');
  assert.throws(() => checkBlock('short'));
  assert.equal(checkBlock('a'.repeat(5000)).length, 4000);
});

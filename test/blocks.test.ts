import { test } from 'node:test';
import assert from 'node:assert/strict';

import { answered, parseBlocks, serializeBlocks, type Block } from '@/lib/blocks';
import { countWords } from '@/lib/day';
import { firstLine } from '@/lib/journal';

const blocks: Block[] = [
  { time: '08:10', question: 'What drained you today?', body: 'Họp dài, mệt.' },
  { time: '21:40', question: null, body: 'Một tách cà phê ngon.\n\nRồi đi ngủ sớm.' },
];
const text = '· 08:10\n› What drained you today?\nHọp dài, mệt.\n\n· 21:40\nMột tách cà phê ngon.\n\nRồi đi ngủ sớm.';

test('writes blocks as one raw text page', () => {
  assert.equal(serializeBlocks(blocks), text);
  assert.equal(serializeBlocks([]), '');
});

test('reads blocks back, including blank lines inside a block', () => {
  assert.deepEqual(parseBlocks(text), blocks);
  assert.deepEqual(parseBlocks(''), []);
});

test('a round trip keeps blank lines at the end of the text being typed', () => {
  for (const body of ['abc\n', 'abc\n\n', '', 'a\n\n\nb']) {
    const bs: Block[] = [{ time: '08:10', question: 'Q?', body: 'x' }, { time: '09:00', question: null, body }];
    assert.deepEqual(parseBlocks(serializeBlocks(bs)), bs, JSON.stringify(body));
  }
});

test('old text without a time line is one block with no time', () => {
  assert.deepEqual(parseBlocks('Hôm nay ổn.'), [{ time: null, question: null, body: 'Hôm nay ổn.' }]);
  assert.deepEqual(parseBlocks('› Q?\nTrả lời.'), [{ time: null, question: 'Q?', body: 'Trả lời.' }]);
});

test('time and question lines are not words and not the timeline first line', () => {
  assert.equal(countWords(text), 12);
  assert.equal(firstLine(text), 'Họp dài, mệt.');
  assert.deepEqual([...answered(blocks)], ['What drained you today?']);
});

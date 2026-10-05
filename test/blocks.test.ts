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

test('ghi các khối thành một trang chữ thô', () => {
  assert.equal(serializeBlocks(blocks), text);
  assert.equal(serializeBlocks([]), '');
});

test('đọc lại đúng các khối, kể cả dòng trống bên trong một khối', () => {
  assert.deepEqual(parseBlocks(text), blocks);
  assert.deepEqual(parseBlocks(''), []);
});

test('đi một vòng không mất dòng trống ở cuối chữ đang gõ', () => {
  for (const body of ['abc\n', 'abc\n\n', '', 'a\n\n\nb']) {
    const bs: Block[] = [{ time: '08:10', question: 'Q?', body: 'x' }, { time: '09:00', question: null, body }];
    assert.deepEqual(parseBlocks(serializeBlocks(bs)), bs, JSON.stringify(body));
  }
});

test('chữ cũ không có dòng giờ là một khối không giờ', () => {
  assert.deepEqual(parseBlocks('Hôm nay ổn.'), [{ time: null, question: null, body: 'Hôm nay ổn.' }]);
  assert.deepEqual(parseBlocks('› Q?\nTrả lời.'), [{ time: null, question: 'Q?', body: 'Trả lời.' }]);
});

test('giờ và câu hỏi không tính vào số chữ, không làm dòng đầu timeline', () => {
  assert.equal(countWords(text), 12);
  assert.equal(firstLine(text), 'Họp dài, mệt.');
  assert.deepEqual([...answered(blocks)], ['What drained you today?']);
});

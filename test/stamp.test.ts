import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STAMP_GAP_MS, needsStamp, stampInsert } from '@/lib/stamp';
import { QUESTIONS, askedIn, nextQuestion, questionFor, questionInsert } from '@/lib/questions';
import { countWords } from '@/lib/day';
import { firstLine } from '@/lib/journal';

const T = new Date(2026, 9, 5, 21, 40).getTime();

test('chỉ chèn mốc khi quay lại sau hơn một tiếng', () => {
  assert.equal(needsStamp('sáng nay ổn', T - STAMP_GAP_MS - 1, T), true);
  assert.equal(needsStamp('sáng nay ổn', T - 10 * 60_000, T), false);
});

test('trang trống hoặc chưa từng lưu thì không chèn', () => {
  assert.equal(needsStamp('', T - 2 * STAMP_GAP_MS, T), false);
  assert.equal(needsStamp('  \n', T - 2 * STAMP_GAP_MS, T), false);
  assert.equal(needsStamp('abc', null, T), false);
});

test('không chèn chồng lên một mốc ở dòng cuối', () => {
  assert.equal(needsStamp('abc\n\n· 09:10\n', T - 2 * STAMP_GAP_MS, T), false);
});

test('mốc luôn có một dòng trống phía trước', () => {
  assert.equal(stampInsert('abc', T), '\n\n· 21:40\n');
  assert.equal(stampInsert('abc\n', T), '\n· 21:40\n');
  assert.equal(stampInsert('abc\n\n', T), '· 21:40\n');
});

test('câu hỏi cố định theo ngày, "another" đổi câu', () => {
  assert.equal(questionFor('2026-10-05'), questionFor('2026-10-05'));
  assert.notEqual(questionFor('2026-10-05', 0), questionFor('2026-10-05', 1));
  assert.ok(QUESTIONS.includes(questionFor('2026-10-05', 12345)));
  assert.ok(QUESTIONS.every((q) => q.length <= 300));
});

test('câu hỏi trong trang: dòng "› …", có dòng trống phía trên', () => {
  assert.equal(questionInsert('', 'Q1?'), '› Q1?\n');
  assert.equal(questionInsert('trả lời', 'Q2?'), '\n\n› Q2?\n');
  assert.equal(questionInsert('trả lời\n', 'Q2?'), '\n› Q2?\n');
});

test('câu hỏi không tính vào số chữ và không làm dòng đầu timeline', () => {
  const text = '› What did you avoid saying today?\nMình đã không nói.\n\n· 21:40\n› What gave you energy?\nĐi bộ.';
  assert.equal(countWords(text), 6);
  assert.equal(firstLine(text), 'Mình đã không nói.');
  assert.deepEqual([...askedIn(text)], ['What did you avoid saying today?', 'What gave you energy?']);
});

test('"+ question" bỏ qua câu đã có trong trang', () => {
  const day = '2026-10-05';
  const first = questionFor(day, 1);
  const next = nextQuestion(day, `› ${first}\nabc`, 1);
  assert.notEqual(next.question, first);
  assert.equal(next.skip, 2);
  assert.equal(nextQuestion(day, 'abc', 1).question, first);
});

test('vừa chèn câu hỏi thì không chèn thêm mốc giờ', () => {
  assert.equal(needsStamp('abc\n\n› Q?\n', T - 2 * STAMP_GAP_MS, T), false);
});

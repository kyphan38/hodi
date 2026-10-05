import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHeatmap,
  buildTimeline,
  findMatches,
  firstLine,
  fold,
  heatLevel,
  onThisDay,
  randomDay,
  reviewEnd,
  search,
} from '@/lib/journal';
import { countWords } from '@/lib/day';
import type { Entry, Review } from '@/types/hodi';

const entry = (date: string, text: string): Entry => ({
  date,
  md: date.slice(5),
  text,
  words: countWords(text),
  prompt: null,
  createdAt: 0,
  updatedAt: 0,
});

const review = (period: string, text: string): Review => ({
  kind: period.includes('W') ? 'week' : 'month',
  period,
  text,
  words: countWords(text),
  createdAt: 0,
  updatedAt: 0,
});

test('dòng đầu bỏ dòng trống và mốc giờ', () => {
  assert.equal(firstLine('\n\n— 08:10\n  Trời mưa.  \nrồi tạnh'), 'Trời mưa.');
  assert.equal(firstLine('— 08:10\n'), '');
  assert.ok(firstLine('a'.repeat(500)).endsWith('…'));
});

test('review kết thúc vào Chủ nhật / ngày cuối tháng', () => {
  assert.equal(reviewEnd({ kind: 'week', period: '2026-W40' }), '2026-10-04');
  assert.equal(reviewEnd({ kind: 'month', period: '2026-02' }), '2026-02-28');
  assert.equal(reviewEnd({ kind: 'month', period: '2026-12' }), '2026-12-31');
});

test('timeline: mới nhất trước, nhóm theo tháng, có khoảng lặng', () => {
  const months = buildTimeline(
    [entry('2026-10-05', 'năm'), entry('2026-10-01', 'một'), entry('2026-09-30', 'ba mươi'), entry('2026-10-02', '')],
    [review('2026-W40', 'tuần này ổn')],
  );
  assert.deepEqual(
    months.map((m) => m.month),
    ['2026-10', '2026-09'],
  );
  const oct = months[0].items;
  // 05 → (2,3,4 trống = 3 ngày lặng) → review W40 (kết thúc 04) → 01
  assert.deepEqual(oct[0], { type: 'entry', date: '2026-10-05', line: 'năm', words: 1 });
  assert.deepEqual(oct[1], { type: 'review', period: '2026-W40', kind: 'week', line: 'tuần này ổn' });
  assert.deepEqual(oct[2], { type: 'gap', days: 3 });
  assert.equal(oct[3].type === 'entry' && oct[3].date, '2026-10-01');
  // 01 → 30/9 liền nhau: không có khoảng lặng; bài rỗng (02) không hiện.
  assert.equal(months[1].items.length, 1);
});

test('một ngày trống thôi thì không tính là khoảng lặng', () => {
  const items = buildTimeline([entry('2026-10-05', 'a'), entry('2026-10-03', 'b')], []).flatMap((m) => m.items);
  assert.equal(items.some((i) => i.type === 'gap'), false);
});

test('heatmap: 53 tuần, tuần cuối chứa hôm nay, mức theo số chữ', () => {
  const { weeks, months } = buildHeatmap([entry('2026-10-05', 'x '.repeat(150))], '2026-10-07');
  assert.equal(weeks.length, 53);
  const last = weeks[52];
  assert.equal(last[0].date, '2026-10-05'); // thứ Hai
  assert.equal(last[0].level, 2);
  assert.equal(last[2].future, false); // hôm nay
  assert.equal(last[3].future, true);
  assert.ok(months.some((m) => m.label === 'Oct'));
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(99), 1);
  assert.equal(heatLevel(600), 4);
});

test('On this day: cùng ngày-tháng các năm trước', () => {
  const list = onThisDay(
    [entry('2024-10-05', 'hai năm'), entry('2025-10-05', 'một năm'), entry('2026-10-05', 'hôm nay'), entry('2025-10-06', 'khác')],
    '2026-10-05',
  );
  assert.deepEqual(
    list.map((x) => [x.years, x.line]),
    [
      [1, 'một năm'],
      [2, 'hai năm'],
    ],
  );
});

test('random day không bao giờ là hôm nay', () => {
  const es = [entry('2026-10-05', 'a'), entry('2026-10-01', 'b')];
  assert.equal(randomDay(es, '2026-10-05', 0.99), '2026-10-01');
  assert.equal(randomDay([entry('2026-10-05', 'a')], '2026-10-05', 0.5), null);
});

test('fold bỏ dấu mà giữ nguyên độ dài', () => {
  assert.equal(fold('Nhật ký Đà Lạt'), 'nhat ky da lat');
  const s = 'Thứ Hai trời mưa 🌧 rồi';
  assert.equal(fold(s).length, s.length);
});

test('search không dấu, khớp mọi từ, tô đúng chữ gốc', () => {
  const es = [entry('2026-10-05', 'Hôm nay viết nhật ký ở Đà Lạt.'), entry('2026-10-01', 'Nhật ký cũ')];
  const hits = search(es, [], 'nhat ky da');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, '2026-10-05');
  assert.equal(hits[0].match, 'nhật');
  assert.deepEqual(
    findMatches('Nhật ký', ['ky']).map(([a, b]) => 'Nhật ký'.slice(a, b)),
    ['ký'],
  );
  assert.equal(search(es, [], '   ').length, 0);
  assert.equal(search([], [review('2026-W40', 'Tuần mệt')], 'met')[0].kind, 'review');
});

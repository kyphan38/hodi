import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addMonths,
  addDays,
  countWords,
  dayLabel,
  dayOf,
  diffDays,
  isDayId,
  isoWeek,
  monthDay,
  weekMonday,
  weekStart,
} from '@/lib/day';

// npm test runs with TZ=Asia/Ho_Chi_Minh, so new Date(y, m, d, h) is Vietnam time.
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

test('a day starts at 04:00, not midnight', () => {
  assert.equal(dayOf(at(2026, 10, 5, 3, 59)), '2026-10-04');
  assert.equal(dayOf(at(2026, 10, 5, 4, 0)), '2026-10-05');
  assert.equal(dayOf(at(2026, 10, 5, 0, 30)), '2026-10-04');
  assert.equal(dayOf(at(2026, 10, 5, 23, 59)), '2026-10-05');
});

test('01:00 on New Year is still 31 December', () => {
  assert.equal(dayOf(at(2027, 1, 1, 1, 0)), '2026-12-31');
});

test('addDays / diffDays across months and a leap year', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(diffDays('2026-10-01', '2026-10-05'), 4);
  assert.equal(diffDays('2026-10-05', '2026-10-01'), -4);
});

test('isDayId rejects days that do not exist', () => {
  assert.equal(isDayId('2026-10-05'), true);
  assert.equal(isDayId('2026-02-30'), false);
  assert.equal(isDayId('2026-10-5'), false);
  assert.equal(isDayId(null), false);
});

test('mono-style day label', () => {
  assert.equal(dayLabel('2026-10-05'), 'MON · 05 OCT 2026');
  assert.equal(monthDay('2026-10-05'), '10-05');
});

test('ISO weeks around New Year', () => {
  assert.equal(isoWeek('2026-10-05'), '2026-W41');
  assert.equal(isoWeek('2026-10-04'), '2026-W40');
  // 1 Jan 2027 is a Friday → in the last week of 2026.
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
  // 29 Dec 2025 is a Monday, the week holding 1 Jan 2026 (Thursday) → 2026-W01.
  assert.equal(isoWeek('2025-12-29'), '2026-W01');
  assert.equal(weekStart('2026-10-04'), '2026-09-28');
  assert.equal(weekMonday('2026-W41'), '2026-10-05');
  assert.equal(weekMonday('2026-W01'), '2025-12-29');
});

test('counts Vietnamese/English words, ignoring lone punctuation', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   \n '), 0);
  assert.equal(countWords('Hôm nay trời mưa.'), 4);
  assert.equal(countWords('I felt ok - not great\n\n· 21:40\nstill ok'), 7); // time mark not counted
});

test('addMonths crosses years both ways', () => {
  assert.equal(addMonths('2026-10', 1), '2026-11');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(addMonths('2026-10', -12), '2025-10');
});

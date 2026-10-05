import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
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

// npm test chạy với TZ=Asia/Ho_Chi_Minh, nên new Date(y, m, d, h) là giờ VN.
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

test('ngày bắt đầu lúc 04:00, không phải nửa đêm', () => {
  assert.equal(dayOf(at(2026, 10, 5, 3, 59)), '2026-10-04');
  assert.equal(dayOf(at(2026, 10, 5, 4, 0)), '2026-10-05');
  assert.equal(dayOf(at(2026, 10, 5, 0, 30)), '2026-10-04');
  assert.equal(dayOf(at(2026, 10, 5, 23, 59)), '2026-10-05');
});

test('qua năm mới lúc 01:00 vẫn là 31/12', () => {
  assert.equal(dayOf(at(2027, 1, 1, 1, 0)), '2026-12-31');
});

test('addDays / diffDays qua tháng và năm nhuận', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(diffDays('2026-10-01', '2026-10-05'), 4);
  assert.equal(diffDays('2026-10-05', '2026-10-01'), -4);
});

test('isDayId chặn ngày không có thật', () => {
  assert.equal(isDayId('2026-10-05'), true);
  assert.equal(isDayId('2026-02-30'), false);
  assert.equal(isDayId('2026-10-5'), false);
  assert.equal(isDayId(null), false);
});

test('nhãn ngày kiểu mono', () => {
  assert.equal(dayLabel('2026-10-05'), 'MON · 05 OCT 2026');
  assert.equal(monthDay('2026-10-05'), '10-05');
});

test('tuần ISO quanh năm mới', () => {
  assert.equal(isoWeek('2026-10-05'), '2026-W41');
  assert.equal(isoWeek('2026-10-04'), '2026-W40');
  // 1/1/2027 là thứ Sáu → thuộc tuần cuối của 2026.
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
  // 29/12/2025 là thứ Hai, tuần chứa 1/1/2026 (thứ Năm) → 2026-W01.
  assert.equal(isoWeek('2025-12-29'), '2026-W01');
  assert.equal(weekStart('2026-10-04'), '2026-09-28');
  assert.equal(weekMonday('2026-W41'), '2026-10-05');
  assert.equal(weekMonday('2026-W01'), '2025-12-29');
});

test('đếm chữ Việt/Anh, bỏ qua dấu câu đứng riêng', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   \n '), 0);
  assert.equal(countWords('Hôm nay trời mưa.'), 4);
  assert.equal(countWords('I felt ok — not great\n\n— 21:40\nstill ok'), 7); // mốc giờ không tính
});

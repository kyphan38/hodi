// ============================================================
// hodi - Review tuần / tháng
//
// Cuối tuần, cuối tháng app hỏi nhẹ một câu, bằng một dòng mờ trên trang hôm
// nay. Không thông báo, không nhắc lại. Viết hay không là tuỳ.
//
// - Tuần: Chủ nhật (tuần này) và thứ Hai (tuần trước).
// - Tháng: ngày cuối tháng (tháng này) và hai ngày đầu tháng (tháng trước).
// File thuần.
// ============================================================

import { addDays, dayTiny, isoWeek, monthLabel, monthOf, parseDay, weekMonday } from '@/lib/day';
import { MONTH_RE, WEEK_RE } from '@/lib/page-data';

export type ReviewKind = 'week' | 'month';

export type ReviewInvite = { kind: ReviewKind; period: string; text: string };

export function reviewKind(period: string): ReviewKind | null {
  if (WEEK_RE.test(period)) return 'week';
  if (MONTH_RE.test(period)) return 'month';
  return null;
}

export function reviewInvites(today: string): ReviewInvite[] {
  const out: ReviewInvite[] = [];
  const dow = parseDay(today).getDay(); // 0 = Chủ nhật
  if (dow === 0) out.push({ kind: 'week', period: isoWeek(today), text: 'This week — what is worth remembering?' });
  if (dow === 1) {
    out.push({ kind: 'week', period: isoWeek(addDays(today, -1)), text: 'Last week — what is worth remembering?' });
  }

  const tomorrow = addDays(today, 1);
  const date = Number(today.slice(8, 10));
  if (monthOf(tomorrow) !== monthOf(today)) {
    out.push({ kind: 'month', period: monthOf(today), text: 'This month — what is worth remembering?' });
  } else if (date <= 2) {
    out.push({ kind: 'month', period: monthOf(addDays(today, -date)), text: 'Last month — what is worth remembering?' });
  }
  return out;
}

/** Các ngày thuộc kỳ review, cũ nhất trước. */
export function periodDays(period: string): string[] {
  if (WEEK_RE.test(period)) {
    const mon = weekMonday(period);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }
  const days: string[] = [];
  for (let d = `${period}-01`; monthOf(d) === period; d = addDays(d, 1)) days.push(d);
  return days;
}

/** 'Week of 28 Sep' / 'October 2026' - nhãn đầu trang review. `withYear` cho file export. */
export function reviewTitle(period: string, withYear = false): string {
  if (!WEEK_RE.test(period)) return monthLabel(period);
  const monday = weekMonday(period);
  return `Week of ${dayTiny(monday)}${withYear ? ` ${monday.slice(0, 4)}` : ''}`;
}

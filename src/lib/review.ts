// ============================================================
// hodi - Weekly / monthly review
//
// At week and month end the app asks one gentle question, as a faint line on
// today's page. No notification, no repeat. Writing it is optional.
//
// - Week: Sunday (this week) and Monday (last week).
// - Month: the last day of the month (this month) and the first two days (last month).
// Pure file.
// ============================================================

import { addDays, dayTiny, isoWeek, monthLabel, monthOf, parseDay, weekMonday } from '@/lib/day';
import { MONTH_RE, WEEK_RE, YEAR_RE } from '@/lib/page-data';

export type ReviewKind = 'week' | 'month' | 'year';

/** Guiding questions on the year review (H4), shown above the editor. */
export const YEAR_QUESTIONS: readonly string[] = [
  'What were the three biggest moments of this year?',
  'What changed in you since January?',
  'Who mattered most this year, and why?',
  'What gave you energy, and what took it?',
  'What did you learn the hard way?',
  'What do you want to carry into next year, and what will you leave behind?',
];

export type ReviewInvite = { kind: ReviewKind; period: string; text: string };

export function reviewKind(period: string): ReviewKind | null {
  if (WEEK_RE.test(period)) return 'week';
  if (MONTH_RE.test(period)) return 'month';
  if (YEAR_RE.test(period)) return 'year';
  return null;
}

export function reviewInvites(today: string): ReviewInvite[] {
  const out: ReviewInvite[] = [];
  const dow = parseDay(today).getDay(); // 0 = Sunday
  if (dow === 0) out.push({ kind: 'week', period: isoWeek(today), text: 'This week: what is worth remembering?' });
  if (dow === 1) {
    out.push({ kind: 'week', period: isoWeek(addDays(today, -1)), text: 'Last week: what is worth remembering?' });
  }

  const tomorrow = addDays(today, 1);
  const date = Number(today.slice(8, 10));
  if (monthOf(tomorrow) !== monthOf(today)) {
    out.push({ kind: 'month', period: monthOf(today), text: 'This month: what is worth remembering?' });
  } else if (date <= 2) {
    out.push({ kind: 'month', period: monthOf(addDays(today, -date)), text: 'Last month: what is worth remembering?' });
  }

  // Year: from 26 December, and the first week of January (H4).
  const md = today.slice(5);
  const year = Number(today.slice(0, 4));
  if (md >= '12-26') out.push({ kind: 'year', period: String(year), text: 'This year: look back on it.' });
  else if (md <= '01-07') out.push({ kind: 'year', period: String(year - 1), text: 'Last year: look back on it.' });
  return out;
}

/** Days in the review period, oldest first. */
export function periodDays(period: string): string[] {
  if (WEEK_RE.test(period)) {
    const mon = weekMonday(period);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }
  const days: string[] = [];
  if (YEAR_RE.test(period)) {
    for (let d = `${period}-01-01`; d.startsWith(period); d = addDays(d, 1)) days.push(d);
    return days;
  }
  for (let d = `${period}-01`; monthOf(d) === period; d = addDays(d, 1)) days.push(d);
  return days;
}

/** 'Week of 28 Sep' / 'October 2026' - review page label. `withYear` for the export file. */
export function reviewTitle(period: string, withYear = false): string {
  if (YEAR_RE.test(period)) return `The year ${period}`;
  if (!WEEK_RE.test(period)) return monthLabel(period);
  const monday = weekMonday(period);
  return `Week of ${dayTiny(monday)}${withYear ? ` ${monday.slice(0, 4)}` : ''}`;
}

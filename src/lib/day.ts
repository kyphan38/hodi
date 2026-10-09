// ============================================================
// hodi - Days, weeks, months, word count
//
// Pure file: no React, no Firestore, no DOM. Every "today" goes through
// dayOf() - never new Date().toISOString().slice(0, 10) (that is the UTC
// date, 7 hours off Vietnam time).
//
// A day starts at 04:00, not midnight: writing at 01:00 is still the previous
// day's page. Late writers do not get one evening split in two.
// ============================================================

export const DAY_START_HOUR = 4;

const MS_HOUR = 3_600_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

function toId(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** epoch ms → 'YYYY-MM-DD' in local time, day starting at 04:00. */
export function dayOf(ts: number): string {
  return toId(new Date(ts - DAY_START_HOUR * MS_HOUR));
}

/** 'YYYY-MM-DD' → Date at 12:00 noon (mid-day, safe from any offset). */
export function parseDay(id: string): Date {
  const [y, m, d] = id.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isDayId(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toId(parseDay(s)) === s;
}

export function addDays(id: string, n: number): string {
  const d = parseDay(id);
  d.setDate(d.getDate() + n);
  return toId(d);
}

/** Days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / (24 * MS_HOUR));
}

/** 'MM-DD' - for "On this day". */
export function monthDay(id: string): string {
  return id.slice(5, 10);
}

/** 'MON · 05 OCT 2026' - page header label, mono style like hub. */
export function dayLabel(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]} · ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
}

/** 'Mon, 5 Oct 2026' - heading in the export file. */
export function dayLong(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'Sun 4' - one timeline row. */
export function dayShort(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
}

/** '12 Oct' - for "edited 12 Oct". */
export function dayTiny(id: string): string {
  const d = parseDay(id);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '2026-10' → 'October 2026'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** 'YYYY-MM' of a day. */
export function monthOf(id: string): string {
  return id.slice(0, 7);
}

/** '2026-10' + 1 → '2026-11'. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
}

/** epoch ms → 'HH:MM' local time. */
export function timeLabel(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- ISO week (Monday first) ----

/** Monday of the week containing this day. */
export function weekStart(id: string): string {
  const dow = (parseDay(id).getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(id, -dow);
}

/** 'YYYY-Www' per ISO 8601: the week's year is the year of its Thursday. */
export function isoWeek(id: string): string {
  const thursday = addDays(weekStart(id), 3);
  const year = Number(thursday.slice(0, 4));
  const week = Math.floor(diffDays(`${year}-01-01`, thursday) / 7) + 1;
  return `${year}-W${pad(week)}`;
}

/** 'YYYY-Www' → Monday of that week. */
export function weekMonday(period: string): string {
  const [y, w] = period.split('-W').map(Number);
  // 4 January is always in week 1.
  return addDays(weekStart(`${y}-01-04`), (w - 1) * 7);
}

// ---- Lines the app inserts ("marks") ----
// Real text in the page (export keeps them), but faint when reading and not
// counted as words: they are the app's words, not yours.

/** Time line at the top of each block: '· 21:40'. See lib/blocks.ts. */
export const STAMP_RE = /^· \d{2}:\d{2}$/;

/** A block's question: '› What did you avoid saying today?'. See lib/blocks.ts. */
export const QUESTION_RE = /^› \S/;

export function isMarkLine(line: string): boolean {
  const t = line.trim();
  return STAMP_RE.test(t) || QUESTION_RE.test(t);
}

/** Word count: each run without spaces that holds a letter or digit is one word.
 *  Vietnamese counts by syllable ("nhật ký" = 2) - enough for the heatmap.
 *  Time and question lines written by the app are not counted. */
export function countWords(text: string): number {
  let n = 0;
  for (const line of text.split('\n')) {
    if (isMarkLine(line)) continue;
    for (const token of line.split(/\s+/)) {
      if (/[\p{L}\p{N}]/u.test(token)) n++;
    }
  }
  return n;
}

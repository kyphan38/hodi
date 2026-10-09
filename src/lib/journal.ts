// ============================================================
// hodi - Looking back over the journal: timeline, heatmap, On this day, random, search
//
// Pure file: no React, no Firestore, no DOM - tested with node:test.
// Input is all entries/reviews (~365 docs a year, small enough to do on the
// device; search also runs on the device, no outside service).
// ============================================================

import { addDays, isMarkLine, diffDays, monthDay, monthOf, weekMonday, weekStart } from '@/lib/day';
import type { Entry, Review } from '@/types/hodi';

// ---- First line ----

const FIRST_LINE_MAX = 140;

/** First line with text (skipping time marks and questions), trimmed for one timeline row. */
export function firstLine(text: string): string {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || isMarkLine(line)) continue;
    return line.length > FIRST_LINE_MAX ? `${line.slice(0, FIRST_LINE_MAX - 1).trimEnd()}…` : line;
  }
  return '';
}

/** Whether a page has real text (a cleared doc still exists but does not count). */
export function hasWords(e: { words: number }): boolean {
  return e.words > 0;
}

// ---- Timeline ----

export type TimelineItem =
  | { type: 'entry'; date: string; line: string; words: number }
  | { type: 'review'; period: string; kind: 'week' | 'month'; line: string }
  | { type: 'gap'; days: number };

export type TimelineMonth = { month: string; items: TimelineItem[] };

/** Last day of a review period - the review shows right above that day in the timeline. */
export function reviewEnd(r: Pick<Review, 'kind' | 'period'>): string {
  if (r.kind === 'week') return addDays(weekMonday(r.period), 6);
  const [y, m] = r.period.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addDays(next, -1);
}

/** At least this many unwritten days before showing "· N quiet days". */
export const QUIET_MIN = 2;

/**
 * Timeline, newest first, grouped by month. Between two entries QUIET_MIN or
 * more empty days apart there is a "quiet" row - no judgment, it just shows
 * the rhythm.
 */
export function buildTimeline(entries: Entry[], reviews: Review[]): TimelineMonth[] {
  type Row = { date: string; order: number; item: TimelineItem };
  const rows: Row[] = [];

  for (const e of entries) {
    if (!hasWords(e)) continue;
    rows.push({ date: e.date, order: 0, item: { type: 'entry', date: e.date, line: firstLine(e.text), words: e.words } });
  }
  for (const r of reviews) {
    if (!hasWords(r)) continue;
    rows.push({ date: reviewEnd(r), order: 1, item: { type: 'review', period: r.period, kind: r.kind, line: firstLine(r.text) } });
  }
  // Newest first; on the same day the review sits above that day's entry.
  rows.sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1));

  const months: TimelineMonth[] = [];
  let lastEntry: string | null = null;
  for (const row of rows) {
    if (row.item.type === 'entry') {
      if (lastEntry) {
        const quiet = diffDays(row.date, lastEntry) - 1;
        if (quiet >= QUIET_MIN) push(months, monthOf(lastEntry), { type: 'gap', days: quiet });
      }
      lastEntry = row.date;
    }
    push(months, monthOf(row.date), row.item);
  }
  return months;
}

function push(months: TimelineMonth[], month: string, item: TimelineItem) {
  const last = months[months.length - 1];
  if (last?.month === month) last.items.push(item);
  else months.push({ month, items: [item] });
}

// ---- Heatmap ----

export const HEAT_WEEKS = 53;

export type HeatCell = { date: string; words: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** 5 levels by word count. Fixed thresholds, not percentiles - so next year compares with this year. */
export function heatLevel(words: number): HeatCell['level'] {
  if (words <= 0) return 0;
  if (words < 100) return 1;
  if (words < 300) return 2;
  if (words < 600) return 3;
  return 4;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 53-column grid (weeks, Monday → Sunday), the last column is this week.
 * `months`: month labels sit in the column holding that month's 1st.
 */
export function buildHeatmap(
  entries: Entry[],
  today: string,
): { weeks: HeatCell[][]; months: { col: number; label: string }[] } {
  const words = new Map(entries.map((e) => [e.date, e.words]));
  const first = addDays(weekStart(today), -7 * (HEAT_WEEKS - 1));
  const weeks: HeatCell[][] = [];
  const months: { col: number; label: string }[] = [];

  for (let w = 0; w < HEAT_WEEKS; w++) {
    const week: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const n = words.get(date) ?? 0;
      week.push({ date, words: n, level: heatLevel(n), future: date > today });
      if (date.endsWith('-01')) months.push({ col: w, label: MONTH_SHORT[Number(date.slice(5, 7)) - 1] });
    }
    weeks.push(week);
  }
  return { weeks, months };
}

/**
 * One month as calendar rows (Monday → Sunday). `null` pads the days of the
 * neighbor months, so the 1st sits under its weekday.
 */
export function buildMonth(entries: Entry[], month: string, today: string): (HeatCell | null)[][] {
  const words = new Map(entries.map((e) => [e.date, e.words]));
  const first = `${month}-01`;
  const rows: (HeatCell | null)[][] = [];
  let row: (HeatCell | null)[] = Array(diffDays(weekStart(first), first)).fill(null);
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) {
    const n = words.get(date) ?? 0;
    row.push({ date, words: n, level: heatLevel(n), future: date > today });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push([...row, ...Array(7 - row.length).fill(null)]);
  return rows;
}

// ---- On this day / random ----

/** Entries on the same month-day in earlier years, most recent first. */
export function onThisDay(entries: Entry[], today: string): { date: string; years: number; line: string }[] {
  const md = monthDay(today);
  const year = Number(today.slice(0, 4));
  return entries
    .filter((e) => e.md === md && e.date < today && hasWords(e))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((e) => ({ date: e.date, years: year - Number(e.date.slice(0, 4)), line: firstLine(e.text) }));
}

/** Any written day other than today. `rand` in [0, 1). */
export function randomDay(entries: Entry[], today: string, rand: number): string | null {
  const pool = entries.filter((e) => e.date !== today && hasWords(e));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))].date;
}

// ---- Search ----

/**
 * Strip accents + lowercase, KEEPING the string length: character i of the
 * folded string matches character i of the original, so match positions
 * highlight the original directly. "Nhật ký" → "nhat ky", "Đà" → "da".
 */
export function fold(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch === 'đ' || ch === 'Đ') {
      out += 'd';
      continue;
    }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const one = (base[0] ?? ch).toLowerCase();
    // Characters outside the BMP (emoji) are 2 code units: keep the length.
    out += one.length === ch.length ? one : ch;
  }
  return out;
}

export function queryTerms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Every match [start, end) of the keywords in text, sorted. */
export function findMatches(text: string, terms: string[]): [number, number][] {
  const hay = fold(text);
  const out: [number, number][] = [];
  for (const t of terms) {
    let i = hay.indexOf(t);
    while (i !== -1) {
      out.push([i, i + t.length]);
      i = hay.indexOf(t, i + t.length);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export type SearchHit = {
  kind: 'entry' | 'review';
  id: string;
  /** Date used for sorting (review: last day of the period). */
  date: string;
  before: string;
  match: string;
  after: string;
};

const SNIPPET_SIDE = 48;

/** Pages containing ALL keywords. Newest first. Snippet around the first match. */
export function search(entries: Entry[], reviews: Review[], query: string, limit = 50): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const pages = [
    ...entries.map((e) => ({ kind: 'entry' as const, id: e.date, date: e.date, text: e.text })),
    ...reviews.map((r) => ({ kind: 'review' as const, id: r.period, date: reviewEnd(r), text: r.text })),
  ];
  const hits: SearchHit[] = [];
  for (const p of pages) {
    const hay = fold(p.text);
    if (!terms.every((t) => hay.includes(t))) continue;
    const [start, end] = findMatches(p.text, terms)[0];
    const from = Math.max(0, start - SNIPPET_SIDE);
    const to = Math.min(p.text.length, end + SNIPPET_SIDE);
    const clean = (s: string) => s.replace(/\s+/g, ' ');
    hits.push({
      kind: p.kind,
      id: p.id,
      date: p.date,
      before: (from > 0 ? '…' : '') + clean(p.text.slice(from, start)).trimStart(),
      match: p.text.slice(start, end),
      after: clean(p.text.slice(end, to)).trimEnd() + (to < p.text.length ? '…' : ''),
    });
  }
  return hits.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

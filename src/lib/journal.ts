// ============================================================
// hodi - Nhìn lại cả cuốn sổ: timeline, heatmap, On this day, random, search
//
// File thuần: không React, không Firestore, không DOM - test bằng node:test.
// Đầu vào là toàn bộ entries/reviews (một năm ~365 doc, đủ nhỏ để làm hết
// trên máy; search cũng chạy trên máy, không cần dịch vụ ngoài).
// ============================================================

import { addDays, isMarkLine, diffDays, monthDay, monthOf, weekMonday, weekStart } from '@/lib/day';
import type { Entry, Review } from '@/types/hodi';

// ---- Dòng đầu tiên ----

const FIRST_LINE_MAX = 140;

/** Dòng có chữ đầu tiên (bỏ mốc giờ và câu hỏi), cắt gọn cho một dòng timeline. */
export function firstLine(text: string): string {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || isMarkLine(line)) continue;
    return line.length > FIRST_LINE_MAX ? `${line.slice(0, FIRST_LINE_MAX - 1).trimEnd()}…` : line;
  }
  return '';
}

/** Trang có chữ thật hay không (xoá hết chữ thì doc vẫn còn, nhưng không tính). */
export function hasWords(e: { words: number }): boolean {
  return e.words > 0;
}

// ---- Timeline ----

export type TimelineItem =
  | { type: 'entry'; date: string; line: string; words: number }
  | { type: 'review'; period: string; kind: 'week' | 'month'; line: string }
  | { type: 'gap'; days: number };

export type TimelineMonth = { month: string; items: TimelineItem[] };

/** Ngày cuối của kỳ review - review hiện ngay trên ngày đó trong timeline. */
export function reviewEnd(r: Pick<Review, 'kind' | 'period'>): string {
  if (r.kind === 'week') return addDays(weekMonday(r.period), 6);
  const [y, m] = r.period.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addDays(next, -1);
}

/** Ít nhất ngần này ngày không viết mới hiện "· N quiet days". */
export const QUIET_MIN = 2;

/**
 * Timeline mới nhất trước, nhóm theo tháng. Giữa hai bài cách nhau từ
 * QUIET_MIN ngày trống trở lên có một dòng "khoảng lặng" - không phán xét,
 * chỉ cho thấy nhịp.
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
  // Mới nhất trước; cùng ngày thì review đứng trên bài của ngày đó.
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

/** 5 mức theo số chữ. Ngưỡng cố định, không theo phần trăm - để năm sau so được với năm nay. */
export function heatLevel(words: number): HeatCell['level'] {
  if (words <= 0) return 0;
  if (words < 100) return 1;
  if (words < 300) return 2;
  if (words < 600) return 3;
  return 4;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Lưới 53 cột (tuần, thứ Hai → Chủ nhật), cột cuối là tuần này.
 * `months`: nhãn tháng đặt ở cột có ngày 1 của tháng đó.
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

// ---- On this day / random ----

/** Bài cùng ngày-tháng của những năm trước, gần nhất trước. */
export function onThisDay(entries: Entry[], today: string): { date: string; years: number; line: string }[] {
  const md = monthDay(today);
  const year = Number(today.slice(0, 4));
  return entries
    .filter((e) => e.md === md && e.date < today && hasWords(e))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((e) => ({ date: e.date, years: year - Number(e.date.slice(0, 4)), line: firstLine(e.text) }));
}

/** Một ngày đã viết bất kỳ, khác hôm nay. `rand` trong [0, 1). */
export function randomDay(entries: Entry[], today: string, rand: number): string | null {
  const pool = entries.filter((e) => e.date !== today && hasWords(e));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))].date;
}

// ---- Search ----

/**
 * Bỏ dấu + chữ thường, GIỮ NGUYÊN độ dài chuỗi: ký tự thứ i của bản gập ứng
 * với ký tự thứ i của bản gốc, nên vị trí khớp dùng thẳng để tô chữ gốc.
 * "Nhật ký" → "nhat ky", "Đà" → "da".
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
    // Ký tự ngoài BMP (emoji) dài 2 code unit: giữ đúng độ dài.
    out += one.length === ch.length ? one : ch;
  }
  return out;
}

export function queryTerms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Mọi vị trí khớp [start, end) của các từ khoá trong text, đã sắp xếp. */
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
  /** Ngày để sắp xếp (review: ngày cuối kỳ). */
  date: string;
  before: string;
  match: string;
  after: string;
};

const SNIPPET_SIDE = 48;

/** Bài nào chứa TẤT CẢ từ khoá. Mới nhất trước. Snippet quanh chỗ khớp đầu tiên. */
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

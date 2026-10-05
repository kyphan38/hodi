// ============================================================
// hodi - Ngày, tuần, tháng, đếm chữ
//
// File thuần: không React, không Firestore, không DOM. Mọi chỗ tính "hôm nay"
// đều đi qua dayOf() - không bao giờ new Date().toISOString().slice(0, 10)
// (đó là ngày UTC, lệch 7 tiếng so với giờ VN).
//
// Một ngày bắt đầu lúc 04:00, không phải nửa đêm: viết lúc 01:00 vẫn là trang
// của hôm trước. Người hay viết khuya không bị cắt đôi một buổi tối.
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

/** epoch ms → 'YYYY-MM-DD' theo giờ máy, ngày bắt đầu lúc 04:00. */
export function dayOf(ts: number): string {
  return toId(new Date(ts - DAY_START_HOUR * MS_HOUR));
}

/** 'YYYY-MM-DD' → Date lúc 12:00 trưa (giữa ngày, tránh mọi lệch giờ). */
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

/** Số ngày từ a tới b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / (24 * MS_HOUR));
}

/** 'MM-DD' - dùng cho "On this day". */
export function monthDay(id: string): string {
  return id.slice(5, 10);
}

/** 'MON · 05 OCT 2026' - nhãn đầu trang, kiểu mono như hub. */
export function dayLabel(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]} · ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
}

/** 'Mon, 5 Oct 2026' - tiêu đề trong file export. */
export function dayLong(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'Sun 4' - một dòng trong timeline. */
export function dayShort(id: string): string {
  const d = parseDay(id);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
}

/** '12 Oct' - dùng cho "edited 12 Oct". */
export function dayTiny(id: string): string {
  const d = parseDay(id);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '2026-10' → 'October 2026'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** 'YYYY-MM' của một ngày. */
export function monthOf(id: string): string {
  return id.slice(0, 7);
}

/** epoch ms → 'HH:MM' giờ máy. */
export function timeLabel(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Tuần ISO (thứ Hai là ngày đầu tuần) ----

/** Thứ Hai của tuần chứa ngày này. */
export function weekStart(id: string): string {
  const dow = (parseDay(id).getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(id, -dow);
}

/** 'YYYY-Www' theo ISO 8601: năm của tuần là năm chứa thứ Năm của tuần đó. */
export function isoWeek(id: string): string {
  const thursday = addDays(weekStart(id), 3);
  const year = Number(thursday.slice(0, 4));
  const week = Math.floor(diffDays(`${year}-01-01`, thursday) / 7) + 1;
  return `${year}-W${pad(week)}`;
}

/** 'YYYY-Www' → thứ Hai của tuần đó. */
export function weekMonday(period: string): string {
  const [y, w] = period.split('-W').map(Number);
  // Ngày 4/1 luôn thuộc tuần 1.
  return addDays(weekStart(`${y}-01-04`), (w - 1) * 7);
}

// ---- Dòng do app chèn ("mark") ----
// Là chữ thật trong trang (export ra vẫn có), nhưng hiện mờ khi đọc và không
// tính vào số chữ: đó là chữ của app, không phải của mình.

/** Dòng giờ đầu mỗi khối: '· 21:40'. Xem lib/blocks.ts. */
export const STAMP_RE = /^· \d{2}:\d{2}$/;

/** Câu hỏi của khối: '› What did you avoid saying today?'. Xem lib/blocks.ts. */
export const QUESTION_RE = /^› \S/;

export function isMarkLine(line: string): boolean {
  const t = line.trim();
  return STAMP_RE.test(t) || QUESTION_RE.test(t);
}

/** Đếm chữ: mỗi cụm không có khoảng trắng mà chứa chữ hoặc số là một chữ.
 *  Tiếng Việt đếm theo âm tiết ("nhật ký" = 2) - đủ để vẽ heatmap.
 *  Dòng giờ và câu hỏi do app ghi không tính. */
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

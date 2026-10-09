// Day ids 'YYYY-MM-DD' (same format as src/lib/day.ts). Pure file.

export function addDaysId(id: string, n: number): string {
  const [y, m, d] = id.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/**
 * A range ending today: 'today', or a number and a unit: '3d', '7d', '30d',
 * '3m', '1y'. Custom ranges use the same form (PLAN-ai A9).
 */
export type Range = string;

const LIMITS = { d: 90, m: 24, y: 5 } as const;

export function parseRange(raw: unknown): Range | null {
  if (raw === 'today') return 'today';
  const m = typeof raw === 'string' ? /^([1-9]\d{0,2})([dmy])$/.exec(raw) : null;
  if (!m) return null;
  return Number(m[1]) <= LIMITS[m[2] as keyof typeof LIMITS] ? m[0] : null;
}

/** Same day n months back, clamped to the month's last day (31 Mar - 1 month = 28 Feb). */
function monthsBack(id: string, n: number): string {
  const [y, m, d] = id.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 - n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 1 - n, Math.min(d, last)));
  return t.toISOString().slice(0, 10);
}

/** First and last day of a range that ends today (today included). */
export function rangeDays(range: Range, today: string): [string, string] {
  if (range === 'today') return [today, today];
  const n = Number(range.slice(0, -1));
  const unit = range.slice(-1);
  if (unit === 'd') return [addDaysId(today, -(n - 1)), today];
  return [addDaysId(monthsBack(today, unit === 'm' ? n : n * 12), 1), today];
}

/** 'YYYY-MM' of every month that touches [from, to], oldest first. */
export function monthsIn(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const end = to.slice(0, 7);
  for (;;) {
    const id = `${y}-${String(m).padStart(2, '0')}`;
    out.push(id);
    if (id >= end) return out;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
}

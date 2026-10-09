// Day ids 'YYYY-MM-DD' (same format as src/lib/day.ts). Pure file.

export function addDaysId(id: string, n: number): string {
  const [y, m, d] = id.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export type Range = 'today' | '3d' | '7d' | '30d';

const RANGE_DAYS: Record<Range, number> = { today: 1, '3d': 3, '7d': 7, '30d': 30 };

export function parseRange(raw: unknown): Range | null {
  return typeof raw === 'string' && raw in RANGE_DAYS ? (raw as Range) : null;
}

/** First and last day of a range that ends today (today included). */
export function rangeDays(range: Range, today: string): [string, string] {
  return [addDaysId(today, -(RANGE_DAYS[range] - 1)), today];
}

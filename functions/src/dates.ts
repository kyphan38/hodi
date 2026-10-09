// Day ids 'YYYY-MM-DD' (same format as src/lib/day.ts). Pure file.

export function addDaysId(id: string, n: number): string {
  const [y, m, d] = id.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** First and last day of a review period: '2026-W40' (ISO week) or '2026-10'. Null if not one. */
export function periodRange(period: string): [string, string] | null {
  const week = /^(\d{4})-W(\d{2})$/.exec(period);
  if (week) {
    const y = Number(week[1]);
    const w = Number(week[2]);
    if (w < 1 || w > 53) return null;
    // 4 January is always in ISO week 1.
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const dow = (jan4.getUTCDay() + 6) % 7;
    const monday = addDaysId(jan4.toISOString().slice(0, 10), (w - 1) * 7 - dow);
    return [monday, addDaysId(monday, 6)];
  }
  const month = /^(\d{4})-(\d{2})$/.exec(period);
  if (month) {
    const m = Number(month[2]);
    if (m < 1 || m > 12) return null;
    const first = `${period}-01`;
    const last = new Date(Date.UTC(Number(month[1]), m, 0)).toISOString().slice(0, 10);
    return [first, last];
  }
  return null;
}

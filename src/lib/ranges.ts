// ============================================================
// hodi - Insight ranges: 'today' or a number + unit ('3d', '3m', '1y').
// Same form and limits as functions/src/dates.ts parseRange. Pure file.
// ============================================================

export type Unit = 'd' | 'm' | 'y';

export const UNIT_MAX: Record<Unit, number> = { d: 90, m: 24, y: 5 };
const UNIT_NAME: Record<Unit, [string, string]> = { d: ['day', 'days'], m: ['month', 'months'], y: ['year', 'years'] };

export const PRESETS = ['today', '3d', '7d', '30d'] as const;

export function makeRange(n: number, unit: Unit): string | null {
  return Number.isInteger(n) && n >= 1 && n <= UNIT_MAX[unit] ? `${n}${unit}` : null;
}

export function splitRange(range: string): { n: number; unit: Unit } | null {
  const m = /^([1-9]\d{0,2})([dmy])$/.exec(range);
  return m ? { n: Number(m[1]), unit: m[2] as Unit } : null;
}

/** 'today', '3 days', '1 month', '2 years'. */
export function rangeLabel(range: string): string {
  const r = splitRange(range);
  if (!r) return range;
  const [one, many] = UNIT_NAME[r.unit];
  return `${r.n} ${r.n === 1 ? one : many}`;
}

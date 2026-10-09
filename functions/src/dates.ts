// Day ids 'YYYY-MM-DD' (same format as src/lib/day.ts). Pure file.

export function addDaysId(id: string, n: number): string {
  const [y, m, d] = id.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// hodi - One year as a printable book (H6): which pages and reviews go in which month. Pure.

import { reviewEnd } from '@/lib/journal';
import type { Entry, Review } from '@/types/hodi';

export type BookMonth = { month: string; entries: Entry[]; reviews: Review[] };

/** Years that have writing, newest first. */
export function bookYears(entries: Pick<Entry, 'date' | 'words'>[]): string[] {
  return [...new Set(entries.filter((e) => e.words > 0).map((e) => e.date.slice(0, 4)))].sort().reverse();
}

/**
 * Months of a year with their pages (oldest first) and the reviews that end in them
 * (weeks and months; the year review goes last, on its own).
 */
export function bookMonths(year: string, entries: Entry[], reviews: Review[]): { months: BookMonth[]; yearReview: Review | null } {
  const months: BookMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const id = `${year}-${String(m).padStart(2, '0')}`;
    const es = entries.filter((e) => e.date.startsWith(`${id}-`) && e.words > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
    const rs = reviews
      .filter((r) => r.kind !== 'year' && r.words > 0 && reviewEnd(r).startsWith(`${id}-`))
      .sort((a, b) => (reviewEnd(a) < reviewEnd(b) ? -1 : 1));
    if (es.length || rs.length) months.push({ month: id, entries: es, reviews: rs });
  }
  const yearReview = reviews.find((r) => r.kind === 'year' && r.period === year && r.words > 0) ?? null;
  return { months, yearReview };
}

// hodi - When a letter opens, and which letters are ready (H1). Pure.

import { addDays } from '@/lib/day';

export type OpenChoice = '1m' | '6m' | '1y';

/** Same day of the month, n months later; a missing day (31 Feb) moves to the month's last day. */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export function openOnFor(today: string, choice: OpenChoice): string {
  return addMonths(today, choice === '1m' ? 1 : choice === '6m' ? 6 : 12);
}

/** A chosen date must be after today. */
export function validOpenOn(today: string, day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day > today && day <= addDays(today, 365 * 20);
}

type L = { openOn: string; openedAt: number | null; createdAt: number };

/** Ready to read today and not opened yet, oldest first. */
export function readyLetters<T extends L>(letters: T[], today: string): T[] {
  return letters.filter((l) => l.openOn <= today && l.openedAt === null).sort((a, b) => a.createdAt - b.createdAt);
}

/** Still sealed. */
export function waitingLetters<T extends L>(letters: T[], today: string): T[] {
  return letters.filter((l) => l.openOn > today).sort((a, b) => (a.openOn < b.openOn ? -1 : 1));
}

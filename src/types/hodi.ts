/** users/{uid}/entries/{YYYY-MM-DD} - one day is one doc. */
export type Entry = {
  date: string;
  /** 'MM-DD', cho "On this day". */
  md: string;
  text: string;
  words: number;
  /** The question on screen when this page was started (null = none). */
  prompt: string | null;
  createdAt: number;
  updatedAt: number;
};

/** users/{uid}/reviews/{'2026-W40' | '2026-10'}. */
export type Review = {
  kind: 'week' | 'month';
  period: string;
  text: string;
  words: number;
  createdAt: number;
  updatedAt: number;
};

/** Save status, shown as a small dot.
 *  idle: nothing to save · local: saved on this device, not in the cloud · synced: in the cloud. */
export type SaveStatus = 'idle' | 'local' | 'synced';

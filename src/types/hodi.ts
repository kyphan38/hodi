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

/** users/{uid}/lessons/{id} - a "next time" step the user chose to keep. Archived, never deleted. */
export type Lesson = {
  id: string;
  text: string;
  /** One line on when it applies (the "what happened" of the source note). */
  situation: string;
  sourceDay: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ReflectResult = { mirror: string; question: string; steps: string[] };

export type NextTimeResult = {
  happened: string;
  didWell: string | null;
  steps: string[];
  helpedBefore: { day: string; text: string }[];
};

export type StoryResult = {
  story: string;
  against: { day: string; text: string }[];
  kinder: string;
  question: string;
};

export type ThenNowResult = { then: string; now: string | null; question: string };

export type LookBackResult = { patterns: { text: string; days: string[] }[]; question: string };

/**
 * users/{uid}/aiNotes/{id} - written by functions/ only, shown under its block.
 * `day` is a review period id ('2026-W40', '2026-10') for lookBack.
 */
export type AiNote = { id: string; day: string; blockTime: string | null; createdAt: number } & (
  | { kind: 'reflect'; result: ReflectResult }
  | { kind: 'nextTime'; result: NextTimeResult }
  | { kind: 'lookBack'; result: LookBackResult }
  | { kind: 'story'; result: StoryResult }
  /** `source`: the old page compared with today. */
  | { kind: 'onThisDay'; result: ThenNowResult; source: string }
);

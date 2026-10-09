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

export type Dated = { text: string; days: string[] };

/** Same shape as functions/src/prompts.ts AnalysisResult. */
export type AnalysisResult = {
  overview: string;
  gives: Dated[];
  takes: Dated[];
  patterns: Dated[];
  wins: Dated[];
  story: { story: string; against: Dated[]; truer: string } | null;
  steps: string[];
  helpedBefore: Dated[];
  /** Missing in analyses made before this field existed. */
  lessonsInAction?: { lesson: string; used: boolean; text: string; days: string[] }[];
  question: string;
};

/** 'today' or number + unit: '3d', '3m', '1y' (see lib/ranges). */
export type Range = string;

/** users/{uid}/aiNotes/{id} with kind 'analysis' - written by functions/ only. */
export type Analysis = {
  id: string;
  kind: 'analysis';
  /** The day it was made ("today" for the range). */
  day: string;
  range: Range;
  from: string;
  to: string;
  result: AnalysisResult;
  createdAt: number;
};

export type TalkMessage = { role: 'ai' | 'me'; text: string; steps?: string[]; at: number };

/** users/{uid}/aiChats/{analysisId} - "write about this", written by functions/ only. */
export type Talk = {
  id: string;
  day: string;
  analysisId: string;
  topic: string;
  messages: TalkMessage[];
  done: boolean;
  createdAt: number;
  updatedAt: number;
};

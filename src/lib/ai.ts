// ============================================================
// hodi - Client side of the AI functions (functions/src/index.ts)
//
// Calls go through Firebase callable functions, so the ID token is sent for us.
// The reply language comes from Settings and is sent with every call.
// ============================================================

import { httpsCallable } from 'firebase/functions';

import { getFunctionsClient } from '@/lib/firebase-client';
import { aiLangStore } from '@/lib/prefs';
import type { Range } from '@/types/hodi';

async function call<Req extends object, Res>(name: string, data: Req, timeout = 120_000): Promise<Res> {
  const fn = httpsCallable<Req & { lang: string }, Res>(getFunctionsClient(), name, { timeout });
  const res = await fn({ ...data, lang: aiLangStore.get() });
  return res.data;
}

export function pingAi(): Promise<{ ok: boolean; text: string }> {
  return call('ping', {});
}

export function dailyQuestion(
  day: string,
  candidates: readonly string[],
): Promise<{ question: string | null; followUp: string | null; busy?: boolean }> {
  return call('daily', { day, candidates });
}

/** The function also saves the analysis; the page shows it from its listener. */
export function analyzeRange(day: string, range: Range): Promise<{ id: string }> {
  // A first long range summarizes every month, which can take a few minutes.
  return call('analyze', { day, range }, 300_000);
}

export type MeaningHit = { day: string; time: string | null; question: string | null; text: string; score: number };

/** `partial`: the index is still being built, so older pages may be missing. */
export function searchByMeaning(query: string): Promise<{ hits: MeaningHit[]; partial: boolean }> {
  return call('search', { query });
}

/** One message in the talk on an analysis; the function stores both sides. */
export function talkAbout(
  analysisId: string,
  day: string,
  text: string,
): Promise<{ reply: string; steps: string[]; done: boolean }> {
  return call('talk', { analysisId, day, text });
}

/** The word shown when an AI call fails: out of Gemini credit gets its own. */
export function failWord(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return code.endsWith('resource-exhausted') ? 'no AI credit' : 'failed';
}

/** Speech to text for the editor (H2). Works with AI off: nothing is kept. '' when nothing was heard. */
export async function transcribe(audio: string, mimeType: string): Promise<string> {
  const res = await call<{ audio: string; mimeType: string }, { text: string }>('transcribe', { audio, mimeType });
  return res.text;
}

/** A look back on one year (H4); the function also saves it to yearSums/{year}. */
export function yearSummary(year: string): Promise<{ text: string }> {
  return call('yearSummary', { year }, 300_000);
}

export type ThemeHit = MeaningHit;

/** One theme over time (H8): blocks oldest first and a short note on how it changed. */
export function themeOverTime(theme: string): Promise<{ summary: string; hits: ThemeHit[]; partial: boolean }> {
  return call('theme', { theme });
}

/** The kept lesson closest to a finished block (H9), or null. */
export function lessonFor(text: string): Promise<{ lesson: { id: string; text: string } | null }> {
  return call('lessonFor', { text }, 30_000);
}

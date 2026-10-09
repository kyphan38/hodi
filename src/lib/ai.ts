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

async function call<Req extends object, Res>(name: string, data: Req): Promise<Res> {
  const fn = httpsCallable<Req & { lang: string }, Res>(getFunctionsClient(), name, { timeout: 120_000 });
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
  return call('analyze', { day, range });
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

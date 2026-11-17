// ============================================================
// hodi - Newer AI tools: transcribe (H2), yearSummary (H4), theme (H8),
// lessonFor (H9). Same rules as index.ts: check the email, log no text.
// ============================================================

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';

import { embedTexts } from './embed.ts';
import { generateText } from './gemini.ts';
import { parseLang } from './lang.ts';
import {
  bestLesson,
  buildThemePrompt,
  buildYearPrompt,
  checkBlock,
  checkTheme,
  checkVoice,
  checkYear,
  parseVoice,
  THEME_LIMIT,
  themeBlocks,
  VOICE_PROMPT,
  VOICE_SCHEMA,
} from './more-prompts.ts';
import { nearest, syncIndex } from './search.ts';
import { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_MODEL_ANALYZE, guard, run } from './shared.ts';
import { monthSummaries, type DatedEntry } from './summaries.ts';
import { monthsIn } from './dates.ts';

/** Voice to text for the editor (H2). Works with AI off: nothing is analysed or kept. */
export const transcribe = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: '512MiB' }, async (req) => {
  guard(req);
  let input;
  try {
    input = checkVoice(req.data);
  } catch (err) {
    throw new HttpsError('invalid-argument', err instanceof Error ? err.message : 'Bad input');
  }
  return run('transcribe', async () => {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL.value(),
      contents: [{ role: 'user', parts: [{ text: VOICE_PROMPT }, { inlineData: { mimeType: input.mimeType, data: input.audio } }] }],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: VOICE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        httpOptions: { timeout: 100_000 },
      },
    });
    return { text: parseVoice(res.text ?? '') };
  });
});

/** A look back on one year (H4), from the cached month summaries. Saved to yearSums/{year}. */
export const yearSummary = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 300, memory: '512MiB' }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { year?: unknown; lang?: unknown };
  let year: string;
  try {
    year = checkYear(data.year, Date.now());
  } catch {
    throw new HttpsError('invalid-argument', 'Bad year');
  }
  const lang = parseLang(data.lang);
  const user = getFirestore().collection('users').doc(uid);
  const snap = await user.collection('entries').where('date', '>=', `${year}-01-01`).where('date', '<=', `${year}-12-31`).get();
  const entries = snap.docs.map((d) => d.data() as DatedEntry).filter((e) => e.text.trim());
  if (entries.length === 0) throw new HttpsError('failed-precondition', 'No pages');
  return run('yearSummary', async () => {
    const months = await monthSummaries(user, GEMINI_API_KEY.value(), GEMINI_MODEL.value(), monthsIn(`${year}-01-01`, `${year}-12-31`), entries);
    const text = await generateText(GEMINI_API_KEY.value(), GEMINI_MODEL_ANALYZE.value(), buildYearPrompt(year, months, lang), {
      temperature: 0.5,
      timeoutMs: 150_000,
    });
    await user.collection('yearSums').doc(year).set({ year, text, lang, pages: entries.length, createdAt: Date.now() });
    return { text };
  });
});

/** One theme over time (H8): related blocks oldest first, and a short note on how it changed. Not saved. */
export const theme = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 120 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { theme?: unknown; lang?: unknown };
  let t: string;
  try {
    t = checkTheme(data.theme);
  } catch {
    throw new HttpsError('invalid-argument', 'Empty theme');
  }
  const lang = parseLang(data.lang);
  const user = getFirestore().collection('users').doc(uid);
  return run('theme', async () => {
    const complete = await syncIndex(user, GEMINI_API_KEY.value(), 35_000);
    const [vector] = await embedTexts(GEMINI_API_KEY.value(), [t]);
    const blocks = themeBlocks(await nearest(user, vector, THEME_LIMIT));
    if (blocks.length === 0) return { summary: '', hits: [], partial: !complete };
    const summary = await generateText(GEMINI_API_KEY.value(), GEMINI_MODEL.value(), buildThemePrompt(t, blocks, lang), {
      temperature: 0.4,
      timeoutMs: 60_000,
      thinking: 'low',
    });
    return { summary, hits: blocks, partial: !complete };
  });
});

/** The kept lesson closest in meaning to a finished block (H9), or null. Not saved. */
export const lessonFor = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  let block: string;
  try {
    block = checkBlock((req.data as { text?: unknown } | undefined)?.text);
  } catch {
    return { lesson: null };
  }
  const snap = await getFirestore().collection(`users/${uid}/lessons`).where('archived', '==', false).get();
  const lessons = snap.docs.map((d) => ({ id: d.id, text: String(d.data().text ?? ''), situation: String(d.data().situation ?? '') })).filter((l) => l.text);
  if (lessons.length === 0) return { lesson: null };
  return run('lessonFor', async () => {
    const vectors = await embedTexts(GEMINI_API_KEY.value(), [block, ...lessons.map((l) => `${l.text}\n${l.situation}`.slice(0, 2000))]);
    const best = bestLesson(
      vectors[0],
      lessons.map((l, i) => ({ item: l, vector: vectors[i + 1] })),
    );
    return { lesson: best ? { id: best.id, text: best.text } : null };
  });
});

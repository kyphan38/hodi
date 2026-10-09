// ============================================================
// hodi - Cloud Functions for AI
//
// The site stays a static export. Only AI runs here, because the Gemini key
// must not reach the browser. Every function checks the same email as
// firestore.rules and reads journal data itself with the Admin SDK.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';
import { CONTEXT_DAYS, formatLessons, formatPast, type LessonLite, type PastEntry } from './context.ts';
import { addDaysId, periodRange } from './dates.ts';
import { generateText } from './gemini.ts';
import { parseLang, replyLanguageRule, type Lang } from './lang.ts';
import {
  buildLookBackPrompt,
  buildNextTimePrompt,
  buildReflectPrompt,
  checkBlock,
  LOOK_BACK_SCHEMA,
  NEXT_TIME_SCHEMA,
  parseLookBack,
  parseNextTime,
  parseReflect,
  REFLECT_SCHEMA,
  type BlockInput,
} from './prompts.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });

function guard(req: CallableRequest): string {
  if (!req.auth || !isAllowed(req.auth.token, ALLOWED_USER_EMAIL.value())) {
    throw new HttpsError('permission-denied', 'Not allowed');
  }
  return req.auth.uid;
}

/** Settings "check": proves auth, the key and the model all work. */
export const ping = onCall({ secrets: [GEMINI_API_KEY] }, async (req) => {
  guard(req);
  const lang = parseLang((req.data as { lang?: unknown } | null)?.lang);
  try {
    const text = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      `Say a short, warm hello to someone opening their journal. One sentence. ${replyLanguageRule(lang)}`,
      { timeoutMs: 15_000 },
    );
    return { ok: true, text };
  } catch (err) {
    // Never log journal text; this prompt has none.
    logger.error('ping failed', err);
    throw new HttpsError('unavailable', 'Model call failed');
  }
});

type Context = { past: string; lessons: string; knownDays: Set<string> };

/** Past pages (CONTEXT_DAYS before the block's day) and lessons not archived. */
async function loadContext(uid: string, day: string): Promise<Context> {
  const user = getFirestore().collection('users').doc(uid);
  const [entriesSnap, lessonsSnap] = await Promise.all([
    user
      .collection('entries')
      .where('date', '>=', addDaysId(day, -CONTEXT_DAYS))
      .where('date', '<', day)
      .get(),
    user.collection('lessons').where('archived', '==', false).get(),
  ]);
  const entries = entriesSnap.docs.map((d) => d.data() as PastEntry);
  const lessons = lessonsSnap.docs.map((d) => d.data() as LessonLite);
  const knownDays = new Set([...entries.map((e) => e.date), ...lessons.map((l) => l.sourceDay)]);
  return { past: formatPast(entries), lessons: formatLessons(lessons), knownDays };
}

type Kind = 'reflect' | 'nextTime' | 'lookBack';

/** `day` is a day id, or a review period id for lookBack. */
async function saveNote(uid: string, day: string, blockTime: string | null, kind: Kind, result: object) {
  const ref = await getFirestore()
    .collection('users')
    .doc(uid)
    .collection('aiNotes')
    .add({ day, blockTime, kind, result, createdAt: Date.now() });
  return ref.id;
}

function readInput(req: CallableRequest): { block: BlockInput; lang: Lang } {
  const data = (req.data ?? {}) as { block?: unknown; lang?: unknown };
  try {
    return { block: checkBlock(data.block), lang: parseLang(data.lang) };
  } catch {
    throw new HttpsError('invalid-argument', 'Bad block');
  }
}

async function run<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Log the error only: never journal text.
    logger.error(`${name} failed`, err instanceof Error ? err.message : String(err));
    throw new HttpsError('unavailable', 'Model call failed');
  }
}

/** Says back what they feel + one question. Advice only when the text asks for it. */
export const reflect = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const { block, lang } = readInput(req);
  return run('reflect', async () => {
    const ctx = await loadContext(uid, block.day);
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildReflectPrompt(block, ctx.past, ctx.lessons, lang),
      { temperature: 0.6, timeoutMs: 45_000, jsonSchema: REFLECT_SCHEMA },
    );
    const result = parseReflect(raw);
    const id = await saveNote(uid, block.day, block.time, 'reflect', result);
    return { id, result };
  });
});

/** What happened, what went well, 1-3 steps for next time, what helped before. */
export const nextTime = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const { block, lang } = readInput(req);
  return run('nextTime', async () => {
    const ctx = await loadContext(uid, block.day);
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildNextTimePrompt(block, ctx.past, ctx.lessons, lang),
      { temperature: 0.5, timeoutMs: 45_000, jsonSchema: NEXT_TIME_SCHEMA },
    );
    const result = parseNextTime(raw, ctx.knownDays);
    const id = await saveNote(uid, block.day, block.time, 'nextTime', result);
    return { id, result };
  });
});

/** Weekly / monthly review: 2-3 things that repeat, with their days, and one question. */
export const lookBack = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 90 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { period?: unknown; lang?: unknown };
  const period = typeof data.period === 'string' ? data.period : '';
  const range = periodRange(period);
  if (!range) throw new HttpsError('invalid-argument', 'Bad period');
  const lang = parseLang(data.lang);

  const user = getFirestore().collection('users').doc(uid);
  const [entriesSnap, lessonsSnap] = await Promise.all([
    user.collection('entries').where('date', '>=', range[0]).where('date', '<=', range[1]).get(),
    user.collection('lessons').where('archived', '==', false).get(),
  ]);
  const entries = entriesSnap.docs.map((d) => d.data() as PastEntry).filter((e) => e.text.trim());
  if (entries.length === 0) throw new HttpsError('failed-precondition', 'No pages');

  return run('lookBack', async () => {
    const pages = formatPast(entries, 'oldest');
    const label = period.includes('W') ? `the week ${range[0]} to ${range[1]}` : `the month ${period}`;
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildLookBackPrompt(label, pages, formatLessons(lessonsSnap.docs.map((d) => d.data() as LessonLite)), lang),
      { temperature: 0.4, timeoutMs: 75_000, jsonSchema: LOOK_BACK_SCHEMA },
    );
    const result = parseLookBack(raw, new Set(entries.map((e) => e.date)));
    const id = await saveNote(uid, period, null, 'lookBack', result);
    return { id, result };
  });
});

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
import { embedTexts } from './embed.ts';
import { generateText } from './gemini.ts';
import { parseLang, replyLanguageRule, type Lang } from './lang.ts';
import {
  buildDeeperPrompt,
  buildIntentionsPrompt,
  buildLookBackPrompt,
  buildPickPrompt,
  buildStoryPrompt,
  buildThenNowPrompt,
  buildNextTimePrompt,
  buildReflectPrompt,
  checkBlock,
  checkCandidates,
  DEEPER_SCHEMA,
  INTENTIONS_SCHEMA,
  LOOK_BACK_SCHEMA,
  NEXT_TIME_SCHEMA,
  parseDeeper,
  parseIntentions,
  parseLookBack,
  parsePick,
  parseStory,
  parseThenNow,
  PICK_SCHEMA,
  STORY_SCHEMA,
  THEN_NOW_SCHEMA,
  parseNextTime,
  parseReflect,
  REFLECT_SCHEMA,
  type BlockInput,
} from './prompts.ts';
import { nearest, syncIndex, type Hit } from './search.ts';

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

/** With the search index: full pages this many days back, plus related blocks from before. */
const RECENT_DAYS = 14;
const RELATED_BLOCKS = 12;

/** Older blocks close in meaning to `text`, newest-first pages excluded. Empty if no index. */
async function relatedBefore(user: FirebaseFirestore.DocumentReference, text: string, before: string): Promise<Hit[]> {
  const [vector] = await embedTexts(GEMINI_API_KEY.value(), [text]);
  const hits = await nearest(user, vector, RELATED_BLOCKS * 3);
  return hits.filter((h) => h.day < before).slice(0, RELATED_BLOCKS);
}

/**
 * Past pages and lessons not archived. With the search index (A7): the last
 * RECENT_DAYS in full plus related older blocks; without it: CONTEXT_DAYS in full.
 */
async function loadContext(uid: string, day: string, blockText?: string): Promise<Context> {
  const user = getFirestore().collection('users').doc(uid);
  const recentFrom = addDaysId(day, -RECENT_DAYS);
  const related = blockText
    ? await relatedBefore(user, blockText, recentFrom).catch((err) => {
        logger.warn('related search failed', err instanceof Error ? err.message : String(err));
        return [] as Hit[];
      })
    : [];
  const from = related.length ? recentFrom : addDaysId(day, -CONTEXT_DAYS);
  const [entriesSnap, lessonsSnap] = await Promise.all([
    user.collection('entries').where('date', '>=', from).where('date', '<', day).get(),
    user.collection('lessons').where('archived', '==', false).get(),
  ]);
  const entries = entriesSnap.docs.map((d) => d.data() as PastEntry);
  const lessons = lessonsSnap.docs.map((d) => d.data() as LessonLite);
  const knownDays = new Set([...entries.map((e) => e.date), ...related.map((h) => h.day), ...lessons.map((l) => l.sourceDay)]);
  let past = formatPast(entries);
  if (related.length) {
    const older = related.map((h) => `### ${h.day}${h.time ? ` ${h.time}` : ''}\n${h.text}`).join('\n\n');
    past = `${past}\n\nRelated moments from older pages:\n${older}`;
  }
  return { past, lessons: formatLessons(lessons), knownDays };
}

type Kind = 'reflect' | 'nextTime' | 'lookBack' | 'story' | 'onThisDay';

/** `day` is a day id, or a review period id for lookBack. */
async function saveNote(
  uid: string,
  day: string,
  blockTime: string | null,
  kind: Kind,
  result: object,
  extra: Record<string, unknown> = {},
) {
  const ref = await getFirestore()
    .collection('users')
    .doc(uid)
    .collection('aiNotes')
    .add({ day, blockTime, kind, result, createdAt: Date.now(), ...extra });
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
    const ctx = await loadContext(uid, block.day, block.body);
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
    const ctx = await loadContext(uid, block.day, block.body);
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

/** One follow-up question after "done". Not saved: it becomes the next block's question. */
export const deeper = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 30 }, async (req) => {
  guard(req);
  const { block, lang } = readInput(req);
  return run('deeper', async () => {
    const raw = await generateText(GEMINI_API_KEY.value(), GEMINI_MODEL.value(), buildDeeperPrompt(block, lang), {
      temperature: 0.7,
      timeoutMs: 20_000,
      jsonSchema: DEEPER_SCHEMA,
    });
    return { question: parseDeeper(raw) };
  });
});

/** Days of pages read for the daily pick and for finding promises. */
const DAILY_DAYS = 7;
/** A run that started this long ago is treated as dead and may be retried. */
const CLAIM_MS = 90_000;

type Meta = {
  questionFor?: { day: string; text: string } | null;
  followUpFor?: { day: string; text: string } | null;
  /** Last page day already searched for promises. */
  intentScanned?: string;
};

/** A failed part should not break the rest of `daily`. */
async function softly<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error(`${name} failed`, err instanceof Error ? err.message : String(err));
    return fallback;
  }
}

/** Saves new promises found in pages not searched yet (PLAN-ai #8). */
async function scanIntentions(
  user: FirebaseFirestore.DocumentReference,
  pages: PastEntry[],
  lang: Lang,
): Promise<void> {
  if (pages.length === 0) return;
  const openSnap = await user.collection('intentions').where('status', '==', 'open').get();
  const open = openSnap.docs.map((d) => String(d.data().text ?? ''));
  const raw = await generateText(
    GEMINI_API_KEY.value(),
    GEMINI_MODEL.value(),
    buildIntentionsPrompt(formatPast(pages), open, lang),
    { temperature: 0.2, timeoutMs: 20_000, jsonSchema: INTENTIONS_SCHEMA },
  );
  const found = parseIntentions(raw, new Set(pages.map((p) => p.date)), addDaysId);
  const batch = getFirestore().batch();
  for (const it of found) {
    batch.set(user.collection('intentions').doc(), { ...it, status: 'open', createdAt: Date.now() });
  }
  await batch.commit();
}

/** The oldest due promise, marked asked right away: each one is asked once only. */
async function takeFollowUp(user: FirebaseFirestore.DocumentReference, day: string): Promise<string | null> {
  const snap = await user.collection('intentions').where('status', '==', 'open').get();
  const due = snap.docs
    .filter((d) => String(d.data().askOn ?? '') <= day)
    .sort((a, b) => String(a.data().askOn).localeCompare(String(b.data().askOn)));
  if (due.length === 0) return null;
  await due[0].ref.update({ status: 'asked', askedOn: day });
  return String(due[0].data().question ?? '') || null;
}

/**
 * Called by Today on the first open of a day (AI on), once a day: the result
 * is kept in users/{uid}/meta/ai and read from there afterwards.
 * 1. Finds promises in pages not searched yet; 2. returns one that is due as
 * `followUp` (asked once); 3. picks today's question from the app's list.
 */
export const daily = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { day?: unknown; candidates?: unknown; lang?: unknown };
  const day = typeof data.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) ? data.day : null;
  let candidates: string[];
  try {
    candidates = checkCandidates(data.candidates);
  } catch {
    throw new HttpsError('invalid-argument', 'Bad candidates');
  }
  if (!day) throw new HttpsError('invalid-argument', 'Bad day');
  const lang = parseLang(data.lang);

  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const metaRef = user.collection('meta').doc('ai');

  // Claim today's run in a transaction: two opens at once (two tabs) must not
  // both scan, or the same promise is saved twice.
  const claim = await db.runTransaction(async (tx) => {
    const meta = ((await tx.get(metaRef)).data() ?? {}) as Meta & { claim?: { day: string; at: number } };
    if (meta.questionFor?.day === day) return { kind: 'done' as const, meta };
    if (meta.claim?.day === day && Date.now() - meta.claim.at < CLAIM_MS) return { kind: 'busy' as const, meta };
    tx.set(metaRef, { claim: { day, at: Date.now() } }, { merge: true });
    return { kind: 'run' as const, meta };
  });
  const meta = claim.meta;
  if (claim.kind === 'busy') return { question: null, followUp: null, busy: true };
  if (claim.kind === 'done') {
    return {
      question: meta.questionFor?.text || null,
      followUp: meta.followUpFor?.day === day ? meta.followUpFor.text || null : null,
    };
  }

  const snap = await user
    .collection('entries')
    .where('date', '>=', addDaysId(day, -DAILY_DAYS))
    .where('date', '<', day)
    .get();
  const pages = snap.docs.map((d) => d.data() as PastEntry).filter((e) => e.text.trim());
  const unscanned = pages.filter((p) => !meta.intentScanned || p.date > meta.intentScanned);

  // Pages count as searched only when the search worked; otherwise retry tomorrow.
  const scanned = await softly('intentions', () => scanIntentions(user, unscanned, lang).then(() => true), false);
  const followUp = await softly('followUp', () => takeFollowUp(user, day), null);

  const recent = formatPast(pages);
  const question = recent
    ? await softly(
        'pick',
        async () => {
          const raw = await generateText(GEMINI_API_KEY.value(), GEMINI_MODEL.value(), buildPickPrompt(recent, candidates), {
            temperature: 0.3,
            timeoutMs: 20_000,
            jsonSchema: PICK_SCHEMA,
          });
          return parsePick(raw, candidates);
        },
        null,
      )
    : null;

  // Keeps the search index fresh with yesterday's writing.
  await softly('index', () => syncIndex(user, GEMINI_API_KEY.value(), 15_000), false);

  // Saved even when empty, so a quiet week does not call again on every open.
  await metaRef.set(
    {
      lastDailyRun: day,
      questionFor: { day, text: question ?? '' },
      followUpFor: { day, text: followUp ?? '' },
      ...(scanned ? { intentScanned: addDaysId(day, -1) } : {}),
    },
    { merge: true },
  );
  return { question, followUp };
});

/** Tests a harsh story they tell about themselves against their own past pages. */
export const story = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const { block, lang } = readInput(req);
  return run('story', async () => {
    const ctx = await loadContext(uid, block.day, block.body);
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildStoryPrompt(block, ctx.past, ctx.lessons, lang),
      { temperature: 0.4, timeoutMs: 45_000, jsonSchema: STORY_SCHEMA },
    );
    const result = parseStory(raw, ctx.knownDays);
    const id = await saveNote(uid, block.day, block.time, 'story', result);
    return { id, result };
  });
});

/** Days of recent pages compared with an "On this day" page. */
const THEN_NOW_DAYS = 30;

/** "On this day": what was on their mind then, how it looks now. */
export const onThisDay = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { day?: unknown; then?: unknown; lang?: unknown };
  const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isDay(data.day) || !isDay(data.then) || data.then >= data.day) {
    throw new HttpsError('invalid-argument', 'Bad days');
  }
  const day = data.day;
  const thenDay = data.then;
  const lang = parseLang(data.lang);

  const user = getFirestore().collection('users').doc(uid);
  const thenDoc = (await user.collection('entries').doc(thenDay).get()).data() as PastEntry | undefined;
  if (!thenDoc?.text.trim()) throw new HttpsError('not-found', 'No page');

  return run('onThisDay', async () => {
    const snap = await user
      .collection('entries')
      .where('date', '>=', addDaysId(day, -THEN_NOW_DAYS))
      .where('date', '<=', day)
      .get();
    const recent = formatPast(snap.docs.map((d) => d.data() as PastEntry));
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildThenNowPrompt(day, thenDay, thenDoc.text, recent, lang),
      { temperature: 0.4, timeoutMs: 45_000, jsonSchema: THEN_NOW_SCHEMA },
    );
    const result = parseThenNow(raw);
    const id = await saveNote(uid, day, null, 'onThisDay', result, { source: thenDay });
    return { id, result };
  });
});

/** Search by meaning: indexes changed pages first, then the nearest blocks. */
export const search = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 120 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { query?: unknown };
  const query = typeof data.query === 'string' ? data.query.trim().slice(0, 500) : '';
  if (!query) throw new HttpsError('invalid-argument', 'Empty query');
  const user = getFirestore().collection('users').doc(uid);
  return run('search', async () => {
    // The first search builds the index; later ones only catch up. The budget
    // stays under the client's 60 s wait; `partial` asks the user to try again.
    const complete = await syncIndex(user, GEMINI_API_KEY.value(), 35_000);
    const [vector] = await embedTexts(GEMINI_API_KEY.value(), [query]);
    const hits = await nearest(user, vector, SEARCH_LIMIT);
    return { hits: hits.filter((h) => h.score >= SEARCH_MIN_SCORE), partial: !complete };
  });
});

const SEARCH_LIMIT = 15;
/** Below this the block is rarely about the query. */
const SEARCH_MIN_SCORE = 0.45;

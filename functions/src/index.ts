// ============================================================
// hodi - Cloud Functions for AI
//
// The site stays a static export. Only AI runs here, because the Gemini key
// must not reach the browser. Every function checks the same email as
// firestore.rules and reads journal data itself with the Admin SDK.
// AI analysis lives on the insight page (PLAN-ai A8); Today only gets the
// day's question from `daily`.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';
import { formatLessons, formatPast, type LessonLite, type PastEntry } from './context.ts';
import { addDaysId, parseRange, rangeDays } from './dates.ts';
import { embedTexts } from './embed.ts';
import { generateText } from './gemini.ts';
import { parseLang, replyLanguageRule, type Lang } from './lang.ts';
import {
  analysisText,
  ANALYZE_SCHEMA,
  buildTalkPrompt,
  parseTalk,
  TALK_MAX_CHARS,
  TALK_MAX_REPLIES,
  TALK_SCHEMA,
  type AnalysisResult,
  type TalkMessage,
  buildAnalyzePrompt,
  buildIntentionsPrompt,
  buildPickPrompt,
  checkCandidates,
  INTENTIONS_SCHEMA,
  parseAnalysis,
  parseIntentions,
  parsePick,
  PICK_SCHEMA,
} from './prompts.ts';
import { nearest, syncIndex } from './search.ts';

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

async function run<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Log the error only: never journal text.
    logger.error(`${name} failed`, err instanceof Error ? err.message : String(err));
    throw new HttpsError('unavailable', 'Model call failed');
  }
}

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

/** Older blocks (before the range) sent as "related moments". */
const RELATED_BLOCKS = 12;

/**
 * Insight page: reads every page in the range (today, 3, 7 or 30 days) and
 * returns one analysis, saved to aiNotes (kind 'analysis', `day` = today).
 */
export const analyze = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 120 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { day?: unknown; range?: unknown; lang?: unknown };
  const range = parseRange(data.range);
  const day = typeof data.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) ? data.day : null;
  if (!range || !day) throw new HttpsError('invalid-argument', 'Bad range');
  const lang = parseLang(data.lang);
  const [from, to] = rangeDays(range, day);

  const user = getFirestore().collection('users').doc(uid);
  const [entriesSnap, lessonsSnap] = await Promise.all([
    user.collection('entries').where('date', '>=', from).where('date', '<=', to).get(),
    user.collection('lessons').where('archived', '==', false).get(),
  ]);
  const entries = entriesSnap.docs.map((d) => d.data() as PastEntry).filter((e) => e.text.trim());
  if (entries.length === 0) throw new HttpsError('failed-precondition', 'No pages');
  const lessons = lessonsSnap.docs.map((d) => d.data() as LessonLite);

  return run('analyze', async () => {
    const pages = formatPast(entries, 'oldest');
    // Older moments close to this range, for "helped before" and the story check.
    const related = await softly(
      'related',
      async () => {
        const [vector] = await embedTexts(GEMINI_API_KEY.value(), [pages.slice(-6_000)]);
        const hits = await nearest(user, vector, RELATED_BLOCKS * 3);
        return hits.filter((h) => h.day < from).slice(0, RELATED_BLOCKS);
      },
      [],
    );
    const older = related.map((h) => `### ${h.day}${h.time ? ` ${h.time}` : ''}\n${h.text}`).join('\n\n');
    const label = range === 'today' ? `the day ${day}` : `the days ${from} to ${to}`;
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildAnalyzePrompt(label, pages, older, formatLessons(lessons), lang),
      { temperature: 0.4, timeoutMs: 90_000, jsonSchema: ANALYZE_SCHEMA },
    );
    const knownDays = new Set([...entries.map((e) => e.date), ...related.map((h) => h.day), ...lessons.map((l) => l.sourceDay)]);
    const result = parseAnalysis(
      raw,
      knownDays,
      lessons.map((l) => l.text),
      new Set(entries.map((e) => e.date)),
    );
    const ref = await user
      .collection('aiNotes')
      .add({ kind: 'analysis', day, range, from, to, blockTime: null, result, createdAt: Date.now() });
    return { id: ref.id, result };
  });
});

type StoredMessage = TalkMessage & { steps?: string[]; at: number };

/**
 * `write about this` on an analysis: one chat per analysis, stored in
 * users/{uid}/aiChats/{analysisId}. Only on the day of the analysis: insight
 * resets each day, older talks stay as read-only history.
 */
export const talk = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = guard(req);
  const data = (req.data ?? {}) as { analysisId?: unknown; day?: unknown; text?: unknown; lang?: unknown };
  const analysisId = typeof data.analysisId === 'string' && /^[A-Za-z0-9]{1,40}$/.test(data.analysisId) ? data.analysisId : null;
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!analysisId || !text || text.length > TALK_MAX_CHARS) throw new HttpsError('invalid-argument', 'Bad message');
  const lang = parseLang(data.lang);

  const user = getFirestore().collection('users').doc(uid);
  const note = (await user.collection('aiNotes').doc(analysisId).get()).data() as
    | { kind?: string; day?: string; from?: string; to?: string; result?: AnalysisResult }
    | undefined;
  if (!note || note.kind !== 'analysis' || !note.result || !note.from || !note.to) {
    throw new HttpsError('not-found', 'No analysis');
  }
  if (note.day !== data.day) throw new HttpsError('failed-precondition', 'Talk is closed');

  const chatRef = user.collection('aiChats').doc(analysisId);
  const chat = ((await chatRef.get()).data() ?? {}) as { messages?: StoredMessage[]; done?: boolean };
  // The first AI message is the analysis question, so the talk starts from it.
  const messages: StoredMessage[] = chat.messages?.length
    ? [...chat.messages]
    : [{ role: 'ai', text: note.result.question, at: Date.now() }];
  if (chat.done) throw new HttpsError('failed-precondition', 'Talk is closed');
  messages.push({ role: 'me', text, at: Date.now() });

  const [entriesSnap, lessonsSnap] = await Promise.all([
    user.collection('entries').where('date', '>=', note.from).where('date', '<=', note.to).get(),
    user.collection('lessons').where('archived', '==', false).get(),
  ]);
  const pages = formatPast(entriesSnap.docs.map((d) => d.data() as PastEntry), 'oldest');
  const lessons = formatLessons(lessonsSnap.docs.map((d) => d.data() as LessonLite));
  // The opening question counts as reply 1.
  const isLast = messages.filter((m) => m.role === 'ai').length + 1 >= TALK_MAX_REPLIES;

  return run('talk', async () => {
    const raw = await generateText(
      GEMINI_API_KEY.value(),
      GEMINI_MODEL.value(),
      buildTalkPrompt(analysisText(note.result!), pages, lessons, messages, lang),
      { temperature: 0.6, timeoutMs: 45_000, jsonSchema: TALK_SCHEMA },
    );
    const answer = parseTalk(raw, isLast);
    messages.push({ role: 'ai', text: answer.reply, ...(answer.steps.length ? { steps: answer.steps } : {}), at: Date.now() });
    await chatRef.set({
      day: note.day,
      analysisId,
      range: (note as { range?: string }).range ?? null,
      from: note.from,
      to: note.to,
      topic: note.result!.question,
      messages,
      done: answer.done,
      createdAt: (chat as { createdAt?: number }).createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    return answer;
  });
});

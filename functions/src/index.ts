// ============================================================
// hodi - Cloud Functions for AI
//
// The site stays a static export. Only AI runs here, because the Gemini key
// must not reach the browser. Every function checks the same email as
// firestore.rules and reads journal data itself with the Admin SDK.
// ============================================================

import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';
import { generateText } from './gemini.ts';
import { parseLang, replyLanguageRule } from './lang.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });

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

// ============================================================
// hodi - Shared setup for the Cloud Functions: region, params, the guard,
// and how model errors reach the app. Imported first by every function file.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { logger, setGlobalOptions } from 'firebase-functions';
import { HttpsError, type CallableRequest } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');
// Flash for every call except analyze. In tests Flash high on analyze took
// over 90 s with 12k thinking tokens; argon took 18 s and read better.
export const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });
export const GEMINI_MODEL_ANALYZE = defineString('GEMINI_MODEL_ANALYZE', { default: 'gemini-4-argon' });

export function guard(req: CallableRequest): string {
  if (!req.auth || !isAllowed(req.auth.token, ALLOWED_USER_EMAIL.value())) {
    throw new HttpsError('permission-denied', 'Not allowed');
  }
  return req.auth.uid;
}

/** Out of Gemini credit (HTTP 402 / 429) gets its own code so the app can say so (same as legi). */
export function modelError(err: unknown): HttpsError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/"code":\s*(402|429)|RESOURCE_EXHAUSTED/.test(msg)) return new HttpsError('resource-exhausted', 'Model quota used up');
  return new HttpsError('unavailable', 'Model call failed');
}

export async function run<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Log the error only: never journal text.
    logger.error(`${name} failed`, err instanceof Error ? err.message : String(err));
    throw modelError(err);
  }
}

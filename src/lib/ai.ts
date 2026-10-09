// ============================================================
// hodi - Client side of the AI functions (functions/src/index.ts)
//
// Calls go through Firebase callable functions, so the ID token is sent for us.
// The reply language comes from Settings and is sent with every call.
// ============================================================

import { httpsCallable } from 'firebase/functions';

import { getFunctionsClient } from '@/lib/firebase-client';
import { aiLangStore } from '@/lib/prefs';

async function call<Req extends object, Res>(name: string, data: Req): Promise<Res> {
  const fn = httpsCallable<Req & { lang: string }, Res>(getFunctionsClient(), name, { timeout: 60_000 });
  const res = await fn({ ...data, lang: aiLangStore.get() });
  return res.data;
}

export function pingAi(): Promise<{ ok: boolean; text: string }> {
  return call('ping', {});
}

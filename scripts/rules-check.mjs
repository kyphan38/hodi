// ---------------------------------------------------------------------------
// hodi - Check firestore.rules against the running emulator
//
//   npm run emu          # terminal 1 (writes rules for the allowed email)
//   npm run test:rules   # terminal 2
//
// Signs in as the allowed user and as a stranger, then tries reads and writes
// that must pass or fail. Journal rule #1: entries can never be deleted.
// Test pages are dated 2000-01-01 so a check never touches real test data.
// Exits 1 if any check is wrong.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync } from 'node:fs';

import { deleteApp, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, setDoc, setLogLevel } from 'firebase/firestore';

// Denied writes are expected here; the SDK would log each one as an error.
setLogLevel('silent');

// Same email as `npm run rules -- --emu`: .env.local, else the dev email.
function allowedEmail() {
  if (existsSync('.env.local')) {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*ALLOWED_USER_EMAIL\s*=\s*['"]?([^'"\s]+)/m);
    if (m) return m[1].toLowerCase();
  }
  return 'dev@hodi.test';
}

const apps = [];

async function client(name, email, verified = true) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-hodi', appId: 'demo-app' }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const token = JSON.stringify({ sub: `check-${name}-${email}`, email, email_verified: verified });
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  return { db, uid: cred.user.uid };
}

let failed = 0;
async function expect(label, shouldPass, fn) {
  let ok;
  try {
    await fn();
    ok = true;
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    ok = false;
  }
  const good = ok === shouldPass;
  if (!good) failed++;
  console.log(`${good ? 'ok  ' : 'FAIL'} ${label} (${ok ? 'allowed' : 'denied'})`);
}

const me = await client('me', allowedEmail());
const stranger = await client('stranger', 'someone@example.com');
const mine = (...p) => doc(me.db, 'users', me.uid, ...p);

const DAY = '2000-01-01';
const entry = { date: DAY, md: '01-01', text: 'test', words: 1, prompt: null, createdAt: 1, updatedAt: 1 };
const review = { kind: 'week', period: '2000-W01', text: 'test', words: 1, createdAt: 1, updatedAt: 1 };
const lesson = { text: 'Sleep earlier.', situation: '', sourceDay: DAY, archived: false, createdAt: 1, updatedAt: 1 };

await expect('owner writes a valid entry', true, () => setDoc(mine('entries', DAY), entry));
await expect('owner reads the entry', true, () => getDoc(mine('entries', DAY)));
await expect('owner deletes an entry', false, () => deleteDoc(mine('entries', DAY)));
await expect('owner writes an entry under the wrong date id', false, () => setDoc(mine('entries', '2000-01-02'), entry));
await expect('owner writes an unknown key', false, () => setDoc(mine('entries', DAY), { ...entry, mood: 3 }));
await expect('owner writes 200001 characters', false, () =>
  setDoc(mine('entries', DAY), { ...entry, text: 'a'.repeat(200001) }),
);
await expect('owner writes a valid week review', true, () => setDoc(mine('reviews', '2000-W01'), review));
await expect('owner deletes a review', false, () => deleteDoc(mine('reviews', '2000-W01')));
await expect('owner writes a lesson', true, () => setDoc(mine('lessons', 'check'), lesson));
await expect('owner deletes a lesson', false, () => deleteDoc(mine('lessons', 'check')));
await expect('owner writes an AI note (functions only)', false, () => setDoc(mine('aiNotes', 'x'), { text: 'x' }));
await expect('owner writes meta (functions only)', false, () => setDoc(mine('meta', 'x'), { a: 1 }));
await expect('owner writes outside users/', false, () => setDoc(doc(me.db, 'other', 'x'), { a: 1 }));
await expect('owner writes another uid', false, () => setDoc(doc(me.db, 'users', stranger.uid, 'entries', DAY), entry));
await expect('stranger writes own entry', false, () => setDoc(doc(stranger.db, 'users', stranger.uid, 'entries', DAY), entry));
await expect('stranger reads owner entry', false, () => getDoc(doc(stranger.db, 'users', me.uid, 'entries', DAY)));

await Promise.all(apps.map((a) => deleteApp(a)));
console.log(failed ? `\n${failed} check(s) failed` : '\nall rules checks passed');
process.exit(failed ? 1 : 0);

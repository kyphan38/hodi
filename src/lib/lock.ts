// ============================================================
// hodi - Face ID lock (a device passkey)
//
// A privacy lock for the open app, not encryption: the journal still sits in
// the Firestore cache. The passkey is checked by the device only (Face ID or
// Touch ID); no server sees it. Per device: the credential id is in
// localStorage, so signing out (clearHodiStorage) also removes the lock.
// ============================================================

import { stringStore } from '@/lib/store';

/** Away longer than this, the app asks for Face ID again. */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

/** base64url credential id of this device's passkey; '' = lock off. */
export const lockCredStore = stringStore<string>('hodi.lockCred', '', (raw) => raw);

/** When the app was last hidden (ms, as text); '' = never. */
export const hiddenAtStore = stringStore<string>('hodi.hiddenAt', '', (raw) => (/^\d+$/.test(raw) ? raw : null));

export function shouldLock(credId: string, hiddenAt: string, now: number): boolean {
  if (!credId || !hiddenAt) return false;
  return now - Number(hiddenAt) >= LOCK_AFTER_MS;
}

export function lockSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

function toB64url(buf: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function challenge(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Creates a device passkey and turns the lock on. Throws if the user cancels. */
export async function setUpLock(uid: string, email: string): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'hodi', id: location.hostname },
      user: { id: new TextEncoder().encode(uid), name: email || 'hodi', displayName: 'hodi lock' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was created.');
  lockCredStore.set(toB64url(cred.rawId));
  hiddenAtStore.set('');
}

/** Asks for Face ID with this device's passkey. Resolves true when it passes. */
export async function unlock(credId: string): Promise<boolean> {
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: fromB64url(credId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return got !== null;
  } catch {
    return false;
  }
}

export function turnOffLock(): void {
  lockCredStore.set('');
  hiddenAtStore.set('');
}

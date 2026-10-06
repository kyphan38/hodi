// ============================================================
// hodi - Backup draft in localStorage
//
// Second safety net after the Firestore cache (rule #4: never lose text).
// Every keystroke writes the draft at once, no debounce.
//
// It also makes the app open "with text at once": the page's draft shows
// before Firestore has read its cache.
//
// Keeps only the current page's draft + drafts NOT yet in the cloud; synced
// drafts of other pages are cleaned on each write. Sign out clears everything
// (clearHodiStorage).
// ============================================================

import { readJson, writeJson } from '@/lib/store';

export type Draft = {
  text: string;
  /** epoch ms of the last keystroke on this device. */
  at: number;
  /** true once Firestore confirms this text reached the server. */
  synced: boolean;
};

const PREFIX = 'hodi.draft.';

export function readDraft(id: string): Draft | null {
  return readJson<Draft>(PREFIX + id);
}

export function writeDraft(id: string, draft: Draft): void {
  writeJson(PREFIX + id, draft);
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX) || k === PREFIX + id) continue;
      if (readJson<Draft>(k)?.synced) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export function markDraftSynced(id: string, text: string): void {
  const d = readDraft(id);
  if (d && !d.synced && d.text === text) writeJson(PREFIX + id, { ...d, synced: true });
}

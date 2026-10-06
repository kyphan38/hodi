'use client';

// ============================================================
// hodi - One text page: read, autosave, draft, status
//
// Used by today's page, past days (after Edit) and reviews.
// The caller must remount per page (key={keyId}) - the hook never switches pages.
//
// Rules:
// - Local text is the source of truth while typing. A remote snapshot never
//   overwrites unsaved text (avoids caret jumps with Telex input).
// - Every keystroke: write the localStorage draft at once, save to Firestore
//   after ~1s, and flush on tab hide / leave / unmount (useSaveOnLeave).
// - Unsaved text plus a server change (another device wrote) → merge, drop neither.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

import { markDraftSynced, readDraft, writeDraft, type Draft } from '@/lib/draft';
import { buildPage, mergeTexts, type PageData, type PageKey } from '@/lib/page-data';
import { watchPage, writePage } from '@/lib/pages';
import { useSaveOnLeave } from '@/hooks/useSaveOnLeave';
import type { SaveStatus } from '@/types/hodi';

const SAVE_DELAY_MS = 1000;

export type PageState = {
  text: string;
  setText: (next: string) => void;
  status: SaveStatus;
  /** First snapshot is in (from cache or server). */
  loaded: boolean;
  /** Latest doc (null if none). */
  data: PageData | null;
  /** Save now, skipping the debounce (⌘S). */
  flush: () => void;
};

function initialStatus(draft: Draft | null): SaveStatus {
  if (!draft) return 'idle';
  return draft.synced ? 'synced' : 'local';
}

export function usePage(
  uid: string,
  key: PageKey,
  /** The question on screen - written to the doc only when the page is created. */
  getPrompt?: () => string | null,
): PageState {
  const { col, id } = key;
  // Tied to uid: this account's draft never leaks into another account.
  const draftId = `${uid}/${col}/${id}`;

  const [draft] = useState(() => readDraft(draftId));
  const [text, setTextState] = useState(draft?.text ?? '');
  const [status, setStatus] = useState<SaveStatus>(() => initialStatus(draft));
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<PageData | null>(null);

  const textRef = useRef(draft?.text ?? '');
  // The text last in sync with the server (written or read).
  // textRef !== savedRef means unsaved text. null = old draft that never reached the cloud.
  const savedRef = useRef<string | null>(draft ? (draft.synced ? draft.text : null) : '');
  const dataRef = useRef<PageData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptRef = useRef(getPrompt);
  const pending = useSaveOnLeave();

  useEffect(() => {
    promptRef.current = getPrompt;
  }, [getPrompt]);

  const save = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const current = textRef.current;
    if (current === savedRef.current) return;
    const prev = dataRef.current;
    savedRef.current = current;
    // Never create a doc for a page that never had text.
    if (!prev && !current.trim()) return;
    const page = buildPage({ col, id } as PageKey, current, prev, promptRef.current?.() ?? null, Date.now());
    writePage(uid, { col, id } as PageKey, page);
  }, [uid, col, id]);

  const schedule = useCallback(() => {
    pending.set(save);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pending.flush(), SAVE_DELAY_MS);
  }, [pending, save]);

  const setText = useCallback(
    (next: string) => {
      textRef.current = next;
      setTextState(next);
      setStatus('local');
      writeDraft(draftId, { text: next, at: Date.now(), synced: false });
      schedule();
    },
    [draftId, schedule],
  );

  useEffect(() => {
    const unsub = watchPage(uid, { col, id } as PageKey, (doc, hasPending) => {
      dataRef.current = doc;
      setData(doc);
      setLoaded(true);

      // Echo of this device's own write - the text is already right.
      if (hasPending) {
        setStatus('local');
        return;
      }

      const remote = doc?.text ?? '';
      const dirty = textRef.current !== savedRef.current;

      if (remote !== savedRef.current) {
        if (!dirty) {
          textRef.current = remote;
          setTextState(remote);
        } else {
          const merged = mergeTexts(remote, textRef.current);
          if (merged !== textRef.current) {
            textRef.current = merged;
            setTextState(merged);
          }
        }
        savedRef.current = remote;
        if (textRef.current !== remote) {
          schedule();
          return;
        }
      } else if (dirty) {
        return;
      }

      setStatus(doc || remote ? 'synced' : 'idle');
      markDraftSynced(draftId, remote);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [uid, col, id, draftId, schedule]);

  const flush = useCallback(() => {
    pending.set(save);
    pending.flush();
  }, [pending, save]);

  return { text, setText, status, loaded, data, flush };
}

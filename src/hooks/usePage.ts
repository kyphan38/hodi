'use client';

// ============================================================
// hodi - Một trang chữ: đọc, autosave, nháp, trạng thái
//
// Dùng cho trang hôm nay, ngày cũ (khi bấm Edit) và review.
// Người gọi phải remount theo trang (key={keyId}) - hook không tự đổi trang.
//
// Quy tắc:
// - Chữ trên máy là nguồn chính khi đang gõ. Snapshot từ xa không bao giờ
//   ghi đè chữ chưa lưu (tránh nhảy con trỏ với bộ gõ Telex).
// - Mỗi lần gõ: ghi nháp localStorage ngay, lưu Firestore sau ~1s, và flush
//   khi ẩn tab / rời trang / unmount (useSaveOnLeave).
// - Có chữ chưa lưu mà server lại đổi (máy khác viết) → gộp, không bỏ bên nào.
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
  /** Snapshot đầu tiên đã về (từ cache hoặc server). */
  loaded: boolean;
  /** Doc mới nhất (null nếu chưa có). */
  data: PageData | null;
  /** Lưu ngay, không chờ debounce (⌘S). */
  flush: () => void;
};

function initialStatus(draft: Draft | null): SaveStatus {
  if (!draft) return 'idle';
  return draft.synced ? 'synced' : 'local';
}

export function usePage(
  uid: string,
  key: PageKey,
  /** Câu hỏi đang hiện - chỉ ghi vào doc lúc trang ra đời. */
  getPrompt?: () => string | null,
): PageState {
  const { col, id } = key;
  // Gắn uid: nháp của tài khoản này không bao giờ lọt sang tài khoản khác.
  const draftId = `${uid}/${col}/${id}`;

  const [draft] = useState(() => readDraft(draftId));
  const [text, setTextState] = useState(draft?.text ?? '');
  const [status, setStatus] = useState<SaveStatus>(() => initialStatus(draft));
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<PageData | null>(null);

  const textRef = useRef(draft?.text ?? '');
  // Bản text khớp với server gần nhất (đã ghi đi hoặc đã đọc về).
  // textRef !== savedRef nghĩa là còn chữ chưa lưu. null = nháp cũ chưa từng lên cloud.
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
    // Không tạo doc cho một trang chưa từng có chữ.
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

      // Tiếng vọng của chính lần ghi trên máy này - text đã đúng sẵn.
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

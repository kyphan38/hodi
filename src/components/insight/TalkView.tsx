'use client';

import { useEffect, useRef, useState } from 'react';

import GrowText from '@/components/GrowText';
import Steps from '@/components/insight/Steps';
import { label, link } from '@/components/insight/styles';
import { talkAbout, failWord } from '@/lib/ai';
import type { Analysis, Talk } from '@/types/hodi';

/**
 * A short chat that starts from the analysis question. The function stores
 * both sides; until the first reply the question is shown on its own.
 */
export default function TalkView({ uid, a, talk, live }: { uid: string; a: Analysis; talk: Talk | null; live: boolean }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [failText, setFailText] = useState('failed');
  const ref = useRef<HTMLTextAreaElement>(null);
  const messages = talk?.messages ?? [{ role: 'ai' as const, text: a.result.question, at: a.createdAt }];
  const open = live && !talk?.done;
  // A reply that arrives while you watch fades in. The ones already there, and
  // your own words, show at once.
  const [seen, setSeen] = useState(messages.length);
  const [newFrom, setNewFrom] = useState<number | null>(null);
  if (messages.length !== seen) {
    setSeen(messages.length);
    setNewFrom(messages.length > seen ? seen : null);
  }

  useEffect(() => {
    if (open) ref.current?.focus({ preventScroll: true });
  }, [open]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || pending) return;
    setPending(msg);
    setText('');
    setFailed(false);
    try {
      await talkAbout(a.id, a.day, msg);
    } catch (err) {
      console.warn('[ai] talk failed', err);
      setFailText(failWord(err));
      setText(msg);
      setFailed(true);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className={label}>talk</p>
      <ul className="mt-2 space-y-4">
        {messages.map((m, i) => (
          <li key={i} className={m.role === 'ai' && newFrom !== null && i >= newFrom ? 'fade-in' : undefined}>
            {m.role === 'me' ? (
              <p className="whitespace-pre-wrap text-ink">{m.text}</p>
            ) : (
              <>
                <p className="text-muted">{m.text}</p>
                {m.steps && m.steps.length > 0 && (
                  <div className="mt-2">
                    <Steps uid={uid} steps={m.steps} situation={a.result.question} day={a.day} />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
        {pending && (
          <li>
            <p className="whitespace-pre-wrap text-ink">{pending}</p>
            <p className={`${label} breathe mt-2`}>…</p>
          </li>
        )}
      </ul>
      {open && !pending && (
        <div className="page-text mt-4">
          <GrowText value={text} onChange={setText} label="Your answer" placeholder="Write back" textareaRef={ref} />
          <p className="mt-2 flex items-baseline justify-end gap-3">
            {failed && <span className={label}>{failText}</span>}
            <button type="button" disabled={!text.trim()} onClick={send} className={`${link} disabled:opacity-40`}>
              send
            </button>
          </p>
        </div>
      )}
      {talk?.done && <p className={`${label} mt-4`}>closed</p>}
    </div>
  );
}

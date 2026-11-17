'use client';

// H2: "voice" under the writing field. Tap to record, tap again to stop (3 minutes
// at most). The words go to the `transcribe` function and are added to the end of
// the block. The audio is never kept. Works with AI off.

import { useEffect, useRef, useState } from 'react';

import { useRecorder } from '@/hooks/useRecorder';
import { transcribe } from '@/lib/ai';

const word = 'py-1 font-mono text-[11px] tracking-[0.04em]';

export default function VoiceWord({ onText }: { onText: (text: string) => void }) {
  const { state, start, stop, cancel, error, supported } = useRecorder();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const wasRecording = useRef(false);
  const stopping = useRef(false);
  const recording = state === 'recording';

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  const say = (text: string) => {
    setNote(text);
    setTimeout(() => setNote(null), 3000);
  };

  const finish = async () => {
    stopping.current = true;
    const rec = await stop();
    stopping.current = false;
    if (!rec) return;
    setBusy(true);
    try {
      const text = await transcribe(rec.base64, rec.mimeType);
      if (text) onText(text);
      else say('nothing heard');
    } catch (err) {
      console.warn('[voice] transcribe failed', err);
      say((err as { code?: string }).code === 'functions/resource-exhausted' ? 'no AI credit' : 'could not read that');
    } finally {
      setBusy(false);
    }
  };

  // The recorder stopped by itself at its limit: still send what was said.
  useEffect(() => {
    if (wasRecording.current && state === 'idle' && !stopping.current) void finish();
    wasRecording.current = state === 'recording';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!supported) return null;

  const toggle = () => {
    if (busy || state === 'requesting' || state === 'processing') return;
    if (recording) {
      void finish();
      return;
    }
    if (!navigator.onLine) {
      say('voice needs a connection');
      return;
    }
    setSecs(0);
    // No await before start(): Safari needs getUserMedia in the same tap.
    void start();
  };

  return (
    <span className="flex items-baseline gap-3">
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={toggle}
        aria-pressed={recording}
        className={`${word} ${recording ? 'text-ink' : 'text-faint hover:text-ink'}`}
      >
        {recording ? `stop ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : busy ? 'writing…' : 'voice'}
      </button>
      {recording && (
        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={cancel} className={`${word} text-faint hover:text-ink`}>
          cancel
        </button>
      )}
      {(note || error) && !recording && <span className={`${word} text-faint`}>{note ?? error}</span>}
    </span>
  );
}

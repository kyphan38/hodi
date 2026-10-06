'use client';

import { useEffect, useRef, useState } from 'react';

import type { SaveStatus } from '@/types/hodi';

const WORDS_MS = 3000;

/**
 * Save status, no words: hollow dot = saved on this device, not in the cloud
 * yet; solid dot = in the cloud (lights up, then fades). No toast, no "offline".
 * Tap → shows the word count for a few seconds.
 */
export default function StatusDot({ status, words, flash }: { status: SaveStatus; words: number; flash: number }) {
  const [showWords, setShowWords] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const reveal = () => {
    setShowWords(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowWords(false), WORDS_MS);
  };

  return (
    <button
      type="button"
      onClick={reveal}
      aria-label={`${words} words`}
      className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-2 p-2 font-mono text-[11px] text-faint"
    >
      <span className="transition-opacity duration-500" style={{ opacity: showWords ? 1 : 0 }}>
        {words} {words === 1 ? 'word' : 'words'}
      </span>
      {status !== 'idle' && (
        <span
          // New key → the animation runs again (saved, or ⌘S).
          key={`${status}-${flash}`}
          className={`block size-[7px] rounded-full border-[1.5px] border-current ${status === 'synced' ? 'settle bg-current' : ''}`}
        />
      )}
    </button>
  );
}

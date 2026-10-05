'use client';

import { useEffect, useRef, useState } from 'react';

import type { SaveStatus } from '@/types/hodi';

const WORDS_MS = 3000;

/**
 * Trạng thái lưu, không chữ: chấm rỗng = đã lưu trên máy, chưa lên cloud;
 * chấm đặc = đã lên cloud (sáng lên rồi mờ dần). Không toast, không "offline".
 * Chạm vào → hiện số chữ trong ít giây.
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
          // key đổi → animation chạy lại (lưu xong, hoặc ⌘S).
          key={`${status}-${flash}`}
          className={`block size-[7px] rounded-full border-[1.5px] border-current ${status === 'synced' ? 'settle bg-current' : ''}`}
        />
      )}
    </button>
  );
}

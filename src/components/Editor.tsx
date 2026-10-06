'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import GrowText from '@/components/GrowText';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** First snapshot is in: only now place the caret at the end. */
  loaded: boolean;
  /** Put the caret at the end when the page opens. */
  focusOnLoad?: boolean;
  label: string;
  /** Shown right under the text (e.g. "done"). */
  below?: ReactNode;
};

/**
 * Edits a whole raw page (a past day after Edit, a review). The large bottom
 * padding lets the current line scroll above the iPhone keyboard; tapping it
 * focuses the end of the text. Today's page uses blocks (TodayView), not this.
 */
export default function Editor({ value, onChange, placeholder, loaded, focusOnLoad, label, below }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focusedOnce = useRef(false);

  const focusEnd = () => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  };

  // On open → caret at the end, scrolled there. (iOS does not open the keyboard
  // on focus without a tap - then a tap on the empty area does it.)
  useEffect(() => {
    if (!loaded || !focusOnLoad || focusedOnce.current) return;
    focusedOnce.current = true;
    focusEnd();
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight * 1.6) window.scrollTo({ top: doc.scrollHeight });
  }, [loaded, focusOnLoad]);

  return (
    <div
      className="page-text min-h-[50dvh] cursor-text pb-[45dvh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) focusEnd();
      }}
    >
      <GrowText value={value} onChange={onChange} placeholder={placeholder} label={label} textareaRef={ref} />
      {below}
    </div>
  );
}

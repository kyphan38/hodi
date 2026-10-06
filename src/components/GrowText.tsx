'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type KeyboardEvent, type Ref, type RefObject } from 'react';

import { markInput, typingStore } from '@/lib/activity';
import { caretTop } from '@/lib/caret';
import { typewriterStore } from '@/lib/prefs';

/** Typewriter mode: the current line sits this far from the top of the screen. */
const TYPEWRITER_LINE = 0.42;

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

/**
 * Plain textarea that grows with its content (the page scrolls, not the box).
 * ::after of .grow holds the same content and pushes the box taller - no JS.
 * In typewriter mode the current line stays near the middle of the screen.
 */
export default function GrowText({ value, onChange, placeholder, label, onKeyDown, textareaRef }: Props) {
  const typewriter =
    useSyncExternalStore(typewriterStore.subscribe, typewriterStore.get, typewriterStore.getServer) === 'on';
  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get, typingStore.getServer);
  const [focused, setFocused] = useState(false);

  const center = useCallback(() => {
    const el = textareaRef.current;
    if (!typewriter || !el || document.activeElement !== el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + caretTop(el);
    window.scrollTo({ top: Math.max(0, y - window.innerHeight * TYPEWRITER_LINE) });
  }, [typewriter, textareaRef]);

  useEffect(() => {
    center();
  }, [value, center]);

  return (
    <div className="grow" data-value={value || placeholder || ''}>
      {typewriter && focused && (
        // Lines above the current one fade slightly.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-[40dvh] bg-linear-to-b from-bg to-transparent transition-opacity duration-700"
          style={{ opacity: typing ? 0.8 : 0 }}
        />
      )}
      <textarea
        ref={textareaRef as Ref<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onKeyUp={center}
        onClick={center}
        onInput={markInput}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          typingStore.set(false);
        }}
        placeholder={placeholder}
        aria-label={label}
        rows={1}
        spellCheck={false}
        autoCapitalize="sentences"
        autoComplete="off"
      />
    </div>
  );
}

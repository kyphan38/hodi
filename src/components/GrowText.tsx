'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from 'react';

import { markInput, typingStore } from '@/lib/activity';
import { caretTop } from '@/lib/caret';
import { typewriterStore } from '@/lib/prefs';

/** Typewriter mode: the current line sits this far from the top of the screen. */
const TYPEWRITER_LINE = 0.42;

/** While focused, how often to look for text that changed without an input event. */
const WATCH_MS = 250;

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
 * ::after of .grow holds the same content and pushes the box taller - no JS layout.
 * In typewriter mode the current line stays near the middle of the screen.
 *
 * Uncontrolled on purpose. iPhone dictation (Vietnamese especially) edits the
 * text as "marked text", sometimes with no input event. A controlled textarea
 * then kept a stale value: the box stayed one line tall, and the next unrelated
 * re-render wrote the stale value back, wiping the spoken words. Now the DOM
 * owns the text, the grow mirror reads the DOM, and `value` is written in only
 * when it really changed from outside (a sync from another device, "done").
 */
export default function GrowText({ value, onChange, placeholder, label, onKeyDown, textareaRef }: Props) {
  const typewriter =
    useSyncExternalStore(typewriterStore.subscribe, typewriterStore.get, typewriterStore.getServer) === 'on';
  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get, typingStore.getServer);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** The last text this field reported or was given: what `value` should be. */
  const known = useRef(value);
  const composing = useRef(false);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const mirror = useCallback(
    (text: string) => {
      if (wrapRef.current) wrapRef.current.dataset.value = text || placeholder || '';
    },
    [placeholder],
  );

  const center = useCallback(() => {
    const el = textareaRef.current;
    if (!typewriter || !el || document.activeElement !== el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + caretTop(el);
    window.scrollTo({ top: Math.max(0, y - window.innerHeight * TYPEWRITER_LINE) });
  }, [typewriter, textareaRef]);

  /** Reads the DOM text; grows the box and reports it if it is new. */
  const pull = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    mirror(el.value);
    if (el.value === known.current) return;
    known.current = el.value;
    onChangeRef.current(el.value);
  }, [textareaRef, mirror]);

  // Text from outside: write it in, but never over words being dictated or composed.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (value !== known.current && !composing.current) {
      known.current = value;
      if (el.value !== value) el.value = value;
    }
    mirror(el.value);
    center();
  }, [value, textareaRef, mirror, center]);

  // Dictation can change the text with no event at all: look while focused.
  useEffect(() => {
    if (!focused) return;
    const t = setInterval(pull, WATCH_MS);
    return () => clearInterval(t);
  }, [focused, pull]);

  return (
    <div ref={wrapRef} className="grow" data-value={value || placeholder || ''}>
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
        defaultValue={value}
        onInput={() => {
          markInput();
          pull();
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionUpdate={() => {
          const el = textareaRef.current;
          if (el) mirror(el.value);
        }}
        onCompositionEnd={() => {
          composing.current = false;
          pull();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={center}
        onClick={center}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          typingStore.set(false);
          composing.current = false;
          pull();
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

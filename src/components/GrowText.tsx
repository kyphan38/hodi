'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type KeyboardEvent, type Ref, type RefObject } from 'react';

import { markInput, typingStore } from '@/lib/activity';
import { caretTop } from '@/lib/caret';
import { typewriterStore } from '@/lib/prefs';

/** Chế độ máy đánh chữ: dòng đang gõ nằm ở khoảng này tính từ đỉnh màn hình. */
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
 * Textarea thuần, tự cao theo nội dung (cả trang cuộn, không phải ô viết).
 * ::after của .grow chứa cùng nội dung và đẩy khung cao lên - không đo bằng JS.
 * Bật chế độ máy đánh chữ thì dòng đang gõ được giữ gần giữa màn hình.
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
        // Các dòng phía trên dòng đang gõ mờ nhẹ đi.
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

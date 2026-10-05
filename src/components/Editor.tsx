'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';

import { markInput, typingStore } from '@/lib/activity';
import { caretTop } from '@/lib/caret';
import { typewriterStore } from '@/lib/prefs';
import { needsStamp, stampInsert } from '@/lib/stamp';

/** Chế độ máy đánh chữ: dòng đang gõ nằm ở khoảng này tính từ đỉnh màn hình. */
const TYPEWRITER_LINE = 0.42;

// Phím không tạo chữ: không được kích hoạt mốc giờ.
const QUIET_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown',
  'Backspace', 'Delete',
]);

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** updatedAt của doc - để biết đã bao lâu chưa viết (mốc giờ). */
  lastWriteAt: number | null;
  /** Snapshot đầu tiên đã về: lúc này mới đặt con trỏ về cuối. */
  loaded: boolean;
  /** Đặt con trỏ ở cuối bài khi mở trang. */
  focusOnLoad?: boolean;
  label: string;
  /** Hiện ngay dưới chữ (vd: "another"). */
  below?: ReactNode;
};

/**
 * Ô viết: textarea thuần, tự cao theo nội dung, cả trang cuộn chứ không phải
 * ô viết. Phần đệm lớn phía dưới để dòng đang gõ luôn kéo lên được trên bàn
 * phím iPhone; chạm vào đó là focus về cuối bài.
 */
export default function Editor({ value, onChange, placeholder, lastWriteAt, loaded, focusOnLoad, label, below }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focusedOnce = useRef(false);
  const lastInput = useRef<number | null>(null);
  const typewriter =
    useSyncExternalStore(typewriterStore.subscribe, typewriterStore.get, typewriterStore.getServer) === 'on';
  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get, typingStore.getServer);

  // Máy đánh chữ: cuộn trang để dòng có con trỏ luôn ở gần giữa màn hình.
  const center = useCallback(() => {
    const el = ref.current;
    if (!typewriter || !el || document.activeElement !== el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + caretTop(el);
    window.scrollTo({ top: Math.max(0, y - window.innerHeight * TYPEWRITER_LINE) });
  }, [typewriter]);

  useEffect(() => {
    center();
  }, [value, center]);

  const focusEnd = () => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  };

  // Mở lại → con trỏ ở cuối bài, cuộn sẵn tới đó. (iOS không bật bàn phím khi
  // focus không do chạm - khi đó chạm vào chỗ trống là xong.)
  useEffect(() => {
    if (!loaded || !focusOnLoad || focusedOnce.current) return;
    focusedOnce.current = true;
    focusEnd();
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight * 1.6) window.scrollTo({ top: doc.scrollHeight });
  }, [loaded, focusOnLoad]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.nativeEvent.isComposing || QUIET_KEYS.has(e.key)) return;
    const el = e.currentTarget;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) return;

    const now = Date.now();
    const last = Math.max(lastWriteAt ?? 0, lastInput.current ?? 0) || null;
    if (!needsStamp(el.value, last, now)) return;

    // Chèn mốc giờ trước ký tự sắp gõ. insertText đi qua undo stack của trình
    // duyệt, nên ⌘Z gỡ được mốc như gỡ chữ thường.
    const insert = stampInsert(el.value, now);
    lastInput.current = now;
    if (!document.execCommand('insertText', false, insert)) onChange(el.value + insert);
  };

  return (
    <div
      className={`page-text min-h-[50dvh] cursor-text pb-[45dvh] ${typewriter ? 'pt-[30dvh]' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) focusEnd();
      }}
    >
      {typewriter && (
        // Các dòng phía trên dòng đang gõ mờ nhẹ đi.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-[40dvh] bg-linear-to-b from-bg to-transparent transition-opacity duration-700"
          style={{ opacity: typing ? 0.8 : 0 }}
        />
      )}
      <div className="grow" data-value={value || placeholder || ''}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={center}
          onClick={center}
          onInput={() => {
            lastInput.current = Date.now();
            markInput();
          }}
          onBlur={() => typingStore.set(false)}
          placeholder={placeholder}
          aria-label={label}
          rows={1}
          spellCheck={false}
          autoCapitalize="sentences"
          autoComplete="off"
        />
      </div>
      {below}
    </div>
  );
}

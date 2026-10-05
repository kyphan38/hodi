'use client';

import { useEffect, useRef } from 'react';

/**
 * ⌘S / Ctrl+S: không mở hộp thoại "lưu trang" của trình duyệt.
 * Lưu ngay và cho chấm trạng thái sáng lên - thói quen tay được trấn an,
 * dù autosave đã lo hết.
 */
export function useSaveShortcut(onSave: () => void): void {
  const ref = useRef(onSave);
  useEffect(() => {
    ref.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

'use client';

import { useEffect, useRef } from 'react';

/**
 * ⌘S / Ctrl+S: do not open the browser's "save page" dialog.
 * Save now and light up the status dot - reassures the habit,
 * even though autosave already handles it.
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

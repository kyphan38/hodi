'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** DaysView reads this flag to focus search when opened with "/". */
export const FOCUS_SEARCH_KEY = 'hodi.days.focus';

/**
 * Global shortcuts on Mac (iPhone has no real keyboard, so no effect there):
 * - Esc: while typing, leave the field; otherwise go to today's page.
 * - "/": go to Days and focus search (on Days, DaysView handles it).
 * ⌘S lives in useSaveShortcut, ⌘E and ←/→ in DayView.
 */
export default function Shortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      const inField = t.tagName === 'TEXTAREA' || t.tagName === 'INPUT';

      if (e.key === 'Escape') {
        if (inField) {
          if (t.tagName === 'TEXTAREA') t.blur();
        } else if (pathname !== '/') {
          router.push('/');
        }
        return;
      }
      if (e.key === '/' && !inField && pathname !== '/days/') {
        e.preventDefault();
        try {
          sessionStorage.setItem(FOCUS_SEARCH_KEY, '1');
        } catch {
          // ignore
        }
        router.push('/days/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return null;
}

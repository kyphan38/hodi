'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** DaysView đọc cờ này để focus ô search khi vừa mở bằng "/". */
export const FOCUS_SEARCH_KEY = 'hodi.days.focus';

/**
 * Phím tắt chung trên Mac (iPhone không có bàn phím thật nên không ảnh hưởng):
 * - Esc: đang gõ thì rời ô viết; không gõ thì về trang hôm nay.
 * - "/": sang Days và focus ô search (ở Days thì DaysView tự lo).
 * ⌘S nằm ở useSaveShortcut, ⌘E và ←/→ nằm ở DayView.
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
          // bỏ qua
        }
        router.push('/days/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return null;
}

'use client';

import Link from 'next/link';
import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { typingStore } from '@/lib/activity';

export type Place = 'today' | 'days' | 'settings';

const HREF: Record<Place, string> = { today: '/', days: '/days/', settings: '/settings/' };

/**
 * Thanh trên cùng thay cho tab bar: nhãn bên trái, vài chữ nhỏ bên phải.
 * Mờ đi khi đang gõ (chỉ còn trang giấy), hiện lại khi cuộn hoặc chạm ra ngoài.
 */
export default function TopBar({ current, left }: { current: Place | null; left?: ReactNode }) {
  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get, typingStore.getServer);
  const places: Place[] = current === 'today' ? ['days', 'settings'] : ['today', 'days', 'settings'];

  useEffect(() => {
    const wake = () => typingStore.set(false);
    const onPointer = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLTextAreaElement)) wake();
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('touchmove', wake, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('wheel', wake);
      window.removeEventListener('touchmove', wake);
    };
  }, []);

  return (
    <header
      className="flex min-h-6 items-baseline justify-between gap-4 font-mono text-[11px] text-faint transition-opacity duration-700"
      style={{ opacity: typing ? 0.12 : 1 }}
    >
      <div className="uppercase tracking-[0.1em]">{left}</div>
      <nav className="flex shrink-0 items-baseline tracking-[0.04em]">
        {places.map((p, i) => (
          <Fragment key={p}>
            {i > 0 && <span className="px-1.5">·</span>}
            {p === current ? (
              <span className="text-ink">{p}</span>
            ) : (
              <Link href={HREF[p]} className="py-2 hover:text-ink">
                {p}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { typingStore } from '@/lib/activity';
import { aiStore } from '@/lib/prefs';

export type Place = 'today' | 'days' | 'insight' | 'settings';

const HREF: Record<Place, string> = { today: '/', days: '/days/', insight: '/insight/', settings: '/settings/' };

/**
 * Top bar instead of a tab bar: label on the left, a few small words on the right.
 * Fades while typing (only the page remains), returns on scroll or a tap outside.
 */
export default function TopBar({ current, left }: { current: Place | null; left?: ReactNode }) {
  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get, typingStore.getServer);
  const aiOn = useSyncExternalStore(aiStore.subscribe, aiStore.get, aiStore.getServer) === 'on';
  // Insight only exists with AI; keep the link while on that page.
  const all: Place[] = aiOn || current === 'insight' ? ['today', 'days', 'insight', 'settings'] : ['today', 'days', 'settings'];
  const places = current === 'today' ? all.filter((p) => p !== 'today') : all;

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

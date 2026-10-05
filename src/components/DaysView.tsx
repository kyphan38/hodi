'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import Heatmap from '@/components/Heatmap';
import { FOCUS_SEARCH_KEY } from '@/components/Shortcuts';
import TopBar from '@/components/TopBar';
import { useJournal } from '@/contexts/JournalContext';
import { clockStore } from '@/lib/clock';
import { dayOf, dayShort, dayTiny, monthLabel, weekMonday } from '@/lib/day';
import { buildTimeline, hasWords, randomDay, search, type TimelineItem } from '@/lib/journal';
import { stringStore } from '@/lib/store';

/** Ô search và vị trí cuộn sống theo phiên: mở một ngày rồi back là về đúng chỗ. */
const queryStore = stringStore<string>('hodi.days.q', '', (raw) => raw, 'session');
const SCROLL_KEY = 'hodi.days.scroll';
const MONTHS_KEY = 'hodi.days.months';
const MONTHS_STEP = 3;

function readSession(key: string): number {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeSession(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // bỏ qua
  }
}

export function reviewLabel(kind: 'week' | 'month', period: string): string {
  if (kind === 'month') return `${monthLabel(period).split(' ')[0]} review`;
  return `week of ${dayTiny(weekMonday(period))}`;
}

export default function DaysView() {
  const router = useRouter();
  const { entries, reviews, loaded } = useJournal();
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.get, clockStore.getServer);
  const today = dayOf(now);

  const query = useSyncExternalStore(queryStore.subscribe, queryStore.get, queryStore.getServer);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const written = useMemo(() => entries.filter(hasWords), [entries]);
  const timeline = useMemo(() => buildTimeline(entries, reviews), [entries, reviews]);
  const hits = useMemo(() => search(entries, reviews, deferredQuery), [entries, reviews, deferredQuery]);

  const [monthsShown, setMonthsShown] = useState(() => Math.max(MONTHS_STEP, readSession(MONTHS_KEY)));
  const sentinel = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // Vẽ dần theo tháng khi cuộn - vài năm viết vẫn nhẹ.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setMonthsShown((n) => n + MONTHS_STEP);
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loaded, query]);

  useEffect(() => writeSession(MONTHS_KEY, monthsShown), [monthsShown]);

  // Nhớ vị trí cuộn; trả lại khi dữ liệu đã về (trước đó trang còn ngắn).
  useEffect(() => {
    if (!loaded || restored.current) return;
    restored.current = true;
    const y = readSession(SCROLL_KEY);
    if (y > 0) window.scrollTo({ top: y });
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => writeSession(SCROLL_KEY, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [loaded]);

  // Vừa mở bằng "/" từ trang khác → focus ô search ngay.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FOCUS_SEARCH_KEY)) {
        sessionStorage.removeItem(FOCUS_SEARCH_KEY);
        inputRef.current?.focus();
      }
    } catch {
      // bỏ qua
    }
  }, []);

  // "/" để tìm, ở bất cứ đâu trên trang (trừ khi đang gõ trong một ô khác).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goRandom = () => {
    const d = randomDay(entries, today, Math.random());
    if (d) router.push(`/day/?d=${d}`);
  };

  const searching = query.trim() !== '';

  return (
    <main className="paper pb-[30dvh]">
      <TopBar current="days" left="days" />

      <div className="relative mt-8">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => queryStore.set(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              queryStore.set('');
              e.currentTarget.blur();
            }
          }}
          placeholder="search"
          aria-label="Search your journal"
          spellCheck={false}
          autoComplete="off"
          className="w-full appearance-none border-b border-line bg-transparent pr-12 pb-2 text-base placeholder:text-faint focus:border-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              queryStore.set('');
              inputRef.current?.focus();
            }}
            className="absolute top-0 right-0 py-1 font-mono text-[11px] text-faint hover:text-ink"
          >
            clear
          </button>
        )}
      </div>

      {searching ? (
        <SearchResults hits={hits} query={deferredQuery} />
      ) : !loaded ? null : written.length === 0 && timeline.length === 0 ? (
        <p className="mt-16 text-muted">
          Nothing yet.{' '}
          <Link href="/" className="text-ink underline decoration-line underline-offset-4 hover:decoration-faint">
            Today is a good page to start.
          </Link>
        </p>
      ) : (
        <>
          <section className="mt-10">
            <Heatmap entries={entries} today={today} />
            <p className="mt-4 flex items-baseline gap-2 font-mono text-[11px] text-faint">
              <span>
                {written.length} {written.length === 1 ? 'day' : 'days'} written
              </span>
              <span>·</span>
              <button type="button" onClick={goRandom} className="hover:text-ink">
                random day
              </button>
            </p>
          </section>

          {timeline.slice(0, monthsShown).map((m) => (
            <section key={m.month} className="mt-12">
              <h2 className="mb-3 font-mono text-[11px] tracking-[0.1em] text-faint uppercase">{monthLabel(m.month)}</h2>
              <ul>
                {m.items.map((item, i) => (
                  <TimelineRow key={i} item={item} />
                ))}
              </ul>
            </section>
          ))}
          {monthsShown < timeline.length && <div ref={sentinel} className="h-px" />}
        </>
      )}
    </main>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  if (item.type === 'gap') {
    return (
      <li className="py-1.5 pl-[4.5rem] font-mono text-[11px] text-faint">
        · {item.days} quiet days
      </li>
    );
  }
  const href = item.type === 'entry' ? `/day/?d=${item.date}` : `/review/?p=${item.period}`;
  return (
    <li>
      <Link href={href} className="group flex items-baseline gap-4 py-1.5">
        <span className="w-14 shrink-0 text-[13px] whitespace-nowrap text-faint tabular-nums">
          {item.type === 'entry' ? dayShort(item.date) : '—'}
        </span>
        <span className="min-w-0 flex-1 truncate group-hover:text-muted">
          {item.type === 'review' && (
            <span className="mr-2 font-mono text-[11px] text-faint">{reviewLabel(item.kind, item.period)}</span>
          )}
          {item.line || <span className="text-faint">…</span>}
        </span>
      </Link>
    </li>
  );
}

function SearchResults({ hits, query }: { hits: ReturnType<typeof search>; query: string }) {
  const q = encodeURIComponent(query.trim());
  if (hits.length === 0) {
    return <p className="mt-10 text-faint">No page has all of these words.</p>;
  }
  return (
    <ul className="mt-8">
      {hits.map((h) => (
        <li key={`${h.kind}-${h.id}`}>
          <Link
            href={h.kind === 'entry' ? `/day/?d=${h.id}&q=${q}` : `/review/?p=${h.id}&q=${q}`}
            className="group block py-3"
          >
            <span className="font-mono text-[11px] text-faint">
              {h.kind === 'entry' ? `${dayShort(h.date)} ${dayTiny(h.date).split(' ')[1]} ${h.date.slice(0, 4)}` : h.id}
            </span>
            <span className="mt-1 block text-[15px] leading-relaxed text-muted group-hover:text-ink">
              {h.before}
              <mark className="rounded-[2px] bg-[var(--select)] text-ink">{h.match}</mark>
              {h.after}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

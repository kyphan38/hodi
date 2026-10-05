'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useJournal } from '@/contexts/JournalContext';
import { onThisDay } from '@/lib/journal';

/**
 * "Ngày này năm trước": vài dòng mờ dưới trang hôm nay, chạm để đọc.
 * Không có bài năm trước thì không hiện gì.
 */
export default function OnThisDay({ today }: { today: string }) {
  const { entries } = useJournal();
  const list = useMemo(() => onThisDay(entries, today), [entries, today]);
  if (list.length === 0) return null;

  return (
    <ul className="space-y-1">
      {list.map((x) => (
        <li key={x.date}>
          <Link href={`/day/?d=${x.date}`} className="group flex items-baseline gap-3 text-faint">
            <span className="shrink-0 font-mono text-[11px]">
              {x.years} {x.years === 1 ? 'year' : 'years'} ago
            </span>
            <span className="min-w-0 truncate text-[14px] group-hover:text-muted">{x.line}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

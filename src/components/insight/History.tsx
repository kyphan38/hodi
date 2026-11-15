import Link from 'next/link';

import TopBar from '@/components/TopBar';
import AnalysisView from '@/components/insight/AnalysisView';
import { label } from '@/components/insight/styles';
import { dayLong, dayShort } from '@/lib/day';
import { latestPerRange, rangeLabel } from '@/lib/ranges';
import type { Analysis } from '@/types/hodi';

const HISTORY_DAYS = 60;

/** Past days with analyses, newest first. Each opens a read-only view. */
export default function History({ analyses, today }: { analyses: Analysis[]; today: string }) {
  const days = [...new Set(analyses.filter((a) => a.day < today).map((a) => a.day))].sort().reverse();
  if (days.length === 0) return null;
  return (
    <section className="mt-16">
      <p className={label}>history</p>
      <ul className="mt-3">
        {days.slice(0, HISTORY_DAYS).map((d) => {
          const ranges = latestPerRange(analyses.filter((a) => a.day === d)).map((a) => rangeLabel(a.range));
          return (
            <li key={d}>
              <Link href={`/insight/?d=${d}`} className="group flex items-baseline gap-4 py-1.5">
                <span className="w-14 shrink-0 text-[13px] whitespace-nowrap text-faint tabular-nums">{dayShort(d)}</span>
                <span className="text-muted group-hover:text-ink">{ranges.join(' · ')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A past day: its newest analysis per range, with the talk, read-only. */
export function PastDay({ uid, day, analyses }: { uid: string; day: string; analyses: Analysis[] }) {
  const list = latestPerRange(analyses.filter((a) => a.day === day));
  return (
    <main className="paper pb-24">
      <TopBar current="insight" left={<Link href="/insight/">insight</Link>} />
      <p className="mt-10 text-[15px] text-ink">{dayLong(day)}</p>
      {list.length === 0 && <p className="mt-6 text-faint">Nothing on this day.</p>}
      {list.map((a) => (
        <section key={a.id} className="mt-10">
          <p className={label}>{rangeLabel(a.range)}</p>
          <AnalysisView uid={uid} a={a} />
        </section>
      ))}
    </main>
  );
}

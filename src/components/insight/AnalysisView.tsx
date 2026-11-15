'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { label, link } from '@/components/insight/styles';
import Steps from '@/components/insight/Steps';
import TalkView from '@/components/insight/TalkView';
import { useTalk } from '@/hooks/useInsight';
import { dayTiny } from '@/lib/day';
import type { Analysis, Dated } from '@/types/hodi';

function rangeTitle(a: Pick<Analysis, 'from' | 'to'>): string {
  return a.from === a.to ? dayTiny(a.from) : `${dayTiny(a.from)} - ${dayTiny(a.to)}`;
}

/** `live`: today's analysis, the talk can go on. Past ones are read-only. */
export default function AnalysisView({
  uid,
  a,
  live = false,
  fade = false,
}: {
  uid: string;
  a: Analysis;
  live?: boolean;
  /** Just arrived: fade in once. */
  fade?: boolean;
}) {
  const r = a.result;
  const talk = useTalk(uid, a.id);
  const [talking, setTalking] = useState(false);
  const showTalk = talking || !!talk;
  return (
    <article className={`mt-4 text-[15px] leading-relaxed${fade ? ' fade-in' : ''}`}>
      <p className={label}>{rangeTitle(a)}</p>
      <p className="mt-1 text-muted">{r.overview}</p>
      <DatedSection title="gives energy" items={r.gives} />
      <DatedSection title="takes energy" items={r.takes} />
      <DatedSection title="keeps coming back" items={r.patterns} />
      <DatedSection title="went well" items={r.wins} />
      {r.story && (
        <Section title="the story">
          <p className="text-muted">&ldquo;{r.story.story}&rdquo;</p>
          {r.story.against.length > 0 && (
            <>
              <p className={`${label} mt-2`}>does not fit</p>
              <DatedList items={r.story.against} />
            </>
          )}
          <p className={`${label} mt-2`}>truer</p>
          <p className="text-muted">{r.story.truer}</p>
        </Section>
      )}
      {r.steps.length > 0 && (
        <Section title="next time, try">
          <Steps uid={uid} steps={r.steps} situation={r.overview} day={a.to} />
        </Section>
      )}
      <DatedSection title="helped before" items={r.helpedBefore} />
      {r.lessonsInAction && r.lessonsInAction.length > 0 && (
        <Section title="lessons in action">
          <ul className="space-y-3">
            {r.lessonsInAction.map((x) => (
              <li key={x.lesson + x.text}>
                <p className={label}>
                  {x.used ? 'used' : 'could have helped'} · {x.lesson}
                </p>
                <DatedList items={[x]} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {r.question && !showTalk && (
        <div className="mt-5">
          <p className="text-faint">{r.question}</p>
          {live && (
            <button type="button" onClick={() => setTalking(true)} className={link}>
              write about this
            </button>
          )}
        </div>
      )}
      {showTalk && <TalkView uid={uid} a={a} talk={talk} live={live} />}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <p className={label}>{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DatedSection({ title, items }: { title: string; items: Dated[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <DatedList items={items} />
    </Section>
  );
}

/** Each item with the days it shows up; a day opens that page. */
function DatedList({ items }: { items: Dated[] }) {
  const thisYear = String(new Date().getFullYear());
  return (
    <ul className="space-y-2">
      {items.map((x) => (
        <li key={x.text}>
          <span className="text-muted">{x.text}</span>
          {x.days.length > 0 && (
            <span className="ml-2 inline-flex flex-wrap gap-x-2">
              {x.days.map((d) => (
                <Link key={d} href={`/day/?d=${d}`} className={`${label} hover:text-ink`}>
                  {dayTiny(d)}
                  {d.slice(0, 4) !== thisYear ? ` ${d.slice(0, 4)}` : ''}
                </Link>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

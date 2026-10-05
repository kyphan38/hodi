'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import Editor from '@/components/Editor';
import OnThisDay from '@/components/OnThisDay';
import { ReviewInvites } from '@/components/ReviewView';
import StatusDot from '@/components/StatusDot';
import TopBar from '@/components/TopBar';
import { useUid } from '@/components/AuthGate';
import { usePage } from '@/hooks/usePage';
import { useSaveShortcut } from '@/hooks/useSaveShortcut';
import { lastInputAt } from '@/lib/activity';
import { countWords, dayLabel, dayOf } from '@/lib/day';
import { entryKey } from '@/lib/page-data';
import { questionsStore } from '@/lib/prefs';
import { questionFor } from '@/lib/questions';

/** Đang mở sẵn qua 04:00: chỉ tự sang trang mới khi đã lâu không gõ. */
const IDLE_MS = 10 * 60_000;

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Trang hôm nay. Tự sang ngày mới khi app quay lại foreground sau 04:00
 * (chữ của hôm trước được flush khi trang cũ unmount - không mất gì).
 */
export default function TodayView() {
  const uid = useUid();
  const [day, setDay] = useState(() => dayOf(Date.now()));

  useEffect(() => {
    const check = (returning: boolean) => {
      const next = dayOf(Date.now());
      if (next === day) return;
      if (!returning && Date.now() - lastInputAt() < IDLE_MS) return;
      setDay(next);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check(true);
    };
    const timer = setInterval(() => check(false), 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [day]);

  return <TodayPage key={day} uid={uid} day={day} />;
}

function TodayPage({ uid, day }: { uid: string; day: string }) {
  const questionsOn =
    useSyncExternalStore(questionsStore.subscribe, questionsStore.get, questionsStore.getServer) === 'on';
  const [skip, setSkip] = useState(0);
  const [flash, setFlash] = useState(0);

  const question = questionsOn ? questionFor(day, skip) : null;
  const getPrompt = useCallback(() => question, [question]);
  const page = usePage(uid, entryKey(day), getPrompt);

  useSaveShortcut(() => {
    page.flush();
    setFlash((n) => n + 1);
  });

  return (
    <main className="paper">
      <TopBar
        current="today"
        left={
          <button type="button" onClick={scrollToTop} className="py-2 uppercase">
            {dayLabel(day)}
          </button>
        }
      />
      <div className="mt-8">
        <Editor
          value={page.text}
          onChange={page.setText}
          placeholder={question ?? ''}
          lastWriteAt={page.data?.updatedAt ?? null}
          loaded={page.loaded}
          focusOnLoad
          label="Today's page"
          below={
            <>
              {question && !page.text && (
                <button
                  type="button"
                  onClick={() => setSkip((n) => n + 1)}
                  className="mt-3 py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink"
                >
                  another
                </button>
              )}
              <div className="mt-14 space-y-6 empty:hidden">
                <ReviewInvites today={day} />
                <OnThisDay today={day} />
              </div>
            </>
          }
        />
      </div>
      <StatusDot status={page.status} words={countWords(page.text)} flash={flash} />
    </main>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import GrowText from '@/components/GrowText';
import OnThisDay from '@/components/OnThisDay';
import { ReviewInvites } from '@/components/ReviewView';
import StatusDot from '@/components/StatusDot';
import TopBar from '@/components/TopBar';
import { useUid } from '@/components/AuthGate';
import { usePage } from '@/hooks/usePage';
import { useSaveShortcut } from '@/hooks/useSaveShortcut';
import { lastInputAt } from '@/lib/activity';
import { answered, parseBlocks, serializeBlocks, type Block } from '@/lib/blocks';
import { countWords, dayLabel, dayOf, timeLabel } from '@/lib/day';
import { entryKey } from '@/lib/page-data';
import { questionsStore } from '@/lib/prefs';
import { nextQuestion } from '@/lib/questions';

/** Left open past 04:00: only move to the new page after a long typing pause. */
const IDLE_MS = 10 * 60_000;

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Today's page. Moves to the new day when the app returns to the foreground
 * after 04:00 (yesterday's text is flushed when the old page unmounts - nothing lost).
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
  const [freeWrite, setFreeWrite] = useState(false);
  // The open block. null = nothing written in the new block yet (showing the prompt question).
  const [editing, setEditing] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const activeRef = useRef<HTMLTextAreaElement>(null);
  const firstQuestion = useRef<string | null>(null);

  const getPrompt = useCallback(() => firstQuestion.current, []);
  const page = usePage(uid, entryKey(day), getPrompt);
  const blocks = useMemo(() => parseBlocks(page.text), [page.text]);
  const last = blocks.length - 1;

  useEffect(() => {
    firstQuestion.current = blocks.find((b) => b.question)?.question ?? null;
  }, [blocks]);

  // Prompt: the next question not answered today. "another" moves one on.
  const suggestion = nextQuestion(day, answered(blocks), skip);
  const composing = editing === null;
  const activeQuestion = composing ? (questionsOn && !freeWrite ? suggestion.question : null) : blocks[editing]?.question;

  const write = (next: Block[]) => page.setText(serializeBlocks(next));

  const onActiveChange = (value: string) => {
    if (composing) {
      if (value === '') return;
      // The first character opens a new block, stamped with the start time.
      const block: Block = { time: timeLabel(Date.now()), question: activeQuestion, body: value };
      setEditing(blocks.length);
      write([...blocks, block]);
      return;
    }
    // Clearing the newest block's text → drop the block, back to the start
    // (question + "another · free write"). Same textarea, so focus stays.
    if (value === '' && editing === last) {
      setEditing(null);
      write(blocks.slice(0, -1));
      return;
    }
    write(blocks.map((b, i) => (i === editing ? { ...b, body: value } : b)));
  };

  /** "done": close the block (drop it if empty), the next question appears. */
  const done = () => {
    if (editing === null) return;
    const kept = blocks.filter((b, i) => i !== editing || b.body.trim() !== '');
    if (kept.length !== blocks.length) write(kept);
    setEditing(null);
    setFreeWrite(false);
    page.flush();
    setFocusAsk((n) => n + 1);
  };

  // Focus once the field is in the page (reopening an old block, or just after "done").
  const [focusAsk, setFocusAsk] = useState(0);
  useEffect(() => {
    if (focusAsk === 0) return;
    const el = activeRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [focusAsk]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      done();
    }
  };

  useSaveShortcut(() => {
    page.flush();
    setFlash((n) => n + 1);
  });

  // App opens → caret in the new block's field. On a long page, scroll down to it.
  const focusedOnce = useRef(false);
  useEffect(() => {
    if (!page.loaded || focusedOnce.current) return;
    focusedOnce.current = true;
    activeRef.current?.focus({ preventScroll: true });
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight * 1.6) window.scrollTo({ top: doc.scrollHeight });
  }, [page.loaded]);

  const link = 'py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink';
  const activeBody = composing ? '' : (blocks[editing]?.body ?? '');

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

      {blocks.length > 0 && (
        <ol className="mt-8 space-y-1">
          {blocks.map((b, i) => {
            // The last open block is in the field below (same textarea, focus stays).
            if (i === editing && i === last) return null;
            if (i === editing) {
              return (
                <li key={`edit-${i}`} className="py-2">
                  <BlockEditor
                    block={b}
                    textareaRef={activeRef}
                    onChange={onActiveChange}
                    onKeyDown={onKeyDown}
                    onDone={done}
                  />
                </li>
              );
            }
            return (
              <li key={`b-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(i);
                    setFocusAsk((n) => n + 1);
                  }}
                  className="group flex w-full items-baseline gap-4 py-2 text-left"
                >
                  <span className="w-11 shrink-0 font-mono text-[11px] text-faint">{b.time ?? ''}</span>
                  <span className="min-w-0 flex-1">
                    {b.question && <span className="block text-[14px] text-faint">{b.question}</span>}
                    <span className="block whitespace-pre-wrap text-[15px] text-muted group-hover:text-ink">
                      {b.body.trim() || '…'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {(composing || editing === last) && (
        <div className={blocks.length > (composing ? 0 : 1) ? 'mt-10' : 'mt-8'}>
          <BlockEditor
            key="active"
            block={{ time: null, question: activeQuestion ?? null, body: activeBody }}
            placeholder={activeQuestion ? '' : 'Write anything.'}
            textareaRef={activeRef}
            onChange={onActiveChange}
            onKeyDown={onKeyDown}
            onDone={composing ? undefined : done}
            links={
              composing ? (
                <p className="flex gap-2">
                  {activeQuestion ? (
                    <>
                      <button type="button" onClick={() => setSkip(suggestion.skip + 1)} className={link}>
                        another
                      </button>
                      <span className="py-1 text-[11px] text-faint">·</span>
                      <button type="button" onClick={() => setFreeWrite(true)} className={link}>
                        free write
                      </button>
                    </>
                  ) : (
                    questionsOn && (
                      <button type="button" onClick={() => setFreeWrite(false)} className={link}>
                        a question
                      </button>
                    )
                  )}
                </p>
              ) : null
            }
          />
        </div>
      )}

      <div className="mt-14 space-y-6 pb-[40dvh] empty:hidden">
        <ReviewInvites today={day} />
        <OnThisDay today={day} />
      </div>
      <StatusDot status={page.status} words={countWords(page.text)} flash={flash} />
    </main>
  );
}

/** A block being written: faint question above (stays while typing), the field, then "done". */
function BlockEditor({
  block,
  placeholder,
  textareaRef,
  onChange,
  onKeyDown,
  onDone,
  links,
}: {
  block: Block;
  placeholder?: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onDone?: () => void;
  links?: ReactNode;
}) {
  return (
    <div
      className="page-text cursor-text"
      onClick={(e) => {
        if (e.target === e.currentTarget) textareaRef.current?.focus();
      }}
    >
      {block.question && <p className="mb-2 text-faint">{block.question}</p>}
      <GrowText
        value={block.body}
        onChange={onChange}
        placeholder={placeholder}
        label={block.question ?? 'Free write'}
        onKeyDown={onKeyDown}
        textareaRef={textareaRef}
      />
      <div className="mt-3 flex items-baseline justify-between gap-4">
        {links ?? <span />}
        {onDone && (
          <button type="button" onClick={onDone} className="py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-ink">
            done
          </button>
        )}
      </div>
    </div>
  );
}

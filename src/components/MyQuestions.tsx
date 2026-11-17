'use client';

import { useState } from 'react';

import { useMyQuestions } from '@/hooks/useMyQuestions';
import { addMyQuestion, archiveMyQuestion } from '@/lib/my-questions';

/** Settings (H3): your own questions, mixed into the daily ones and under the "mine" topic. */
export default function MyQuestions({ uid }: { uid: string }) {
  const { list } = useMyQuestions(uid);
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (!t) return;
    addMyQuestion(uid, t);
    setText('');
  };
  return (
    <section className="mt-10 text-[15px]">
      <p className="text-muted">My questions</p>
      <ul className="mt-2 space-y-1">
        {list.map((q) => (
          <li key={q.id} className="flex items-baseline gap-4">
            <span className="min-w-0 flex-1 text-ink">{q.text}</span>
            <button type="button" onClick={() => archiveMyQuestion(uid, q.id)} className="shrink-0 text-faint hover:text-ink">
              remove
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-2 flex items-baseline gap-4"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="a question to be asked"
          aria-label="New question"
          className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-base placeholder:text-faint focus:border-faint focus-visible:outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="shrink-0 text-faint hover:text-ink disabled:opacity-40">
          add
        </button>
      </form>
    </section>
  );
}

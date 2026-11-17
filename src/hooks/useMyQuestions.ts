'use client';

import { useEffect, useMemo, useState } from 'react';

import { watchMyQuestions, type MyQuestion } from '@/lib/my-questions';

/** The user's own questions (H3), oldest first. `texts` is what the question picker needs. */
export function useMyQuestions(uid: string): { list: MyQuestion[]; texts: string[] } {
  const [list, setList] = useState<MyQuestion[]>([]);
  useEffect(() => watchMyQuestions(uid, setList), [uid]);
  const texts = useMemo(() => list.map((q) => q.text), [list]);
  return { list, texts };
}

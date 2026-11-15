'use client';

import { useEffect, useState } from 'react';

import { watchAnalyses, watchTalk } from '@/lib/insight-data';
import type { Analysis, Talk } from '@/types/hodi';

export function useAnalyses(uid: string): Analysis[] {
  const [list, setList] = useState<Analysis[]>([]);
  useEffect(() => watchAnalyses(uid, setList), [uid]);
  return list;
}

export function useTalk(uid: string, analysisId: string): Talk | null {
  const [talk, setTalk] = useState<Talk | null>(null);
  useEffect(() => watchTalk(uid, analysisId, setTalk), [uid, analysisId]);
  return talk;
}

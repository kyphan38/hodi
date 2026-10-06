// ============================================================
// hodi - Daily prompt questions
//
// Today's page shows one faint question, plus "another" and "free write".
// Typing answers it; "done" closes it and the next one appears. Answering is
// optional, nothing is counted. Goal: make it easy to be honest about feelings
// and face the facts - without pressure (too many questions make people quit).
//
// Short questions, easy English. Add or remove freely; order does not matter
// because the day's question is picked by a hash of the date.
// ============================================================

import { QUESTION_RE } from '@/lib/day';

export const QUESTIONS: readonly string[] = [
  // feelings
  'What are you feeling right now, in one honest word?',
  'What took most of your energy today?',
  'What gave you a little energy back today?',
  'When did you feel most like yourself today?',
  'What feeling did you push away today?',
  'What is sitting heavy in your chest right now?',
  'What made you smile, even a little?',
  // honesty
  'What did you avoid saying today?',
  'What are you pretending not to know?',
  'What would you say if no one would ever read this?',
  'What is one thing you did today that you are not proud of?',
  'Where did you say yes when you meant no?',
  'What story are you telling yourself that may not be true?',
  'What did you do today only to look good?',
  // shadow
  'Who annoyed you today, and what does that say about you?',
  'What are you afraid people will find out about you?',
  'What are you jealous of right now?',
  'What part of yourself did you hide today?',
  'What are you still angry about?',
  'Which habit is quietly costing you the most?',
  // body
  'How did your body feel today?',
  'Did you rest today, or only stop?',
  // people
  'Who did you think about most today?',
  'What do you wish someone had asked you today?',
  'Who do you owe a message, an apology, or a thank you?',
  'When did you feel alone today?',
  'What did someone do today that you want to remember?',
  // change
  'What is one small thing you can do differently tomorrow?',
  'What are you ready to stop doing?',
  'What truth do you need to accept to move forward?',
  'What did today teach you?',
  'If today happened again, what would you change?',
  'What are you waiting for permission to do?',
  'What would make tomorrow ten percent better?',
  // small joys
  'What was the best ten minutes of your day?',
  'What small thing are you grateful for today?',
  'What did you notice today that you usually miss?',
  'What are you looking forward to?',
  'What went better than you expected?',
  'Write about today as if you were telling an old friend.',
];

/** Simple string hash (FNV-1a 32-bit) - spreads evenly, same day same question. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The question for a day. `skip` goes up each time "another" is pressed. */
export function questionFor(day: string, skip = 0): string {
  const n = QUESTIONS.length;
  return QUESTIONS[(hash(day) + skip) % n];
}

/** Questions already in the page ("› …" lines). */
export function askedIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (QUESTION_RE.test(t)) out.add(t.slice(2));
  }
  return out;
}

/** The next question (from `skip` on) not yet answered today. */
export function nextQuestion(day: string, asked: Set<string>, skip: number): { question: string; skip: number } {
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = questionFor(day, skip + i);
    if (!asked.has(q)) return { question: q, skip: skip + i };
  }
  return { question: questionFor(day, skip), skip };
}

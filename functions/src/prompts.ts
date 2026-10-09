// ============================================================
// Prompts and result checks for the AI functions.
// Logic (PLAN-ai): AI lives on the insight page and reads whole days.
// Advice is small, concrete, in the writer's control, and built on their
// own pages. Pure file: the root test suite imports it.
// ============================================================

import { replyLanguageRule, type Lang } from './lang.ts';

const VOICE = `You are a calm, honest friend reading someone's private journal.
Rules:
- Short sentences. Plain words. No therapy jargon, no diagnosis.
- Never say "you should". Use "you could try" or "one option is".
- No generic tips (sleep more, breathe deeply, drink water) unless their own pages show it helped them.
- No blame and no flattery. Do not praise what was not really good.
- If the problem is outside their control, say so and only suggest what they can control.
- If the text shows a wish to hurt themselves or die: do not analyse. Say gently that you are glad they wrote it down, and suggest talking to a real person they trust today or calling 115. Return no steps.
- Use their older pages and kept lessons only when they truly fit. Quote dates exactly as given. Never invent a date or a fact.`;

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;
const datedList = {
  type: 'array',
  items: { type: 'object', properties: { text: str, days: strList }, required: ['text', 'days'] },
} as const;

function clean(s: unknown, max = 600): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

// ---- Analyze a range of days (insight page) ----

export type Dated = { text: string; days: string[] };
export type Story = { story: string; against: Dated[]; truer: string };

/** A kept lesson seen in the range: used, or a moment where it could have helped. */
export type LessonInAction = { lesson: string; used: boolean; text: string; days: string[] };

export type AnalysisResult = {
  overview: string;
  gives: Dated[];
  takes: Dated[];
  patterns: Dated[];
  wins: Dated[];
  story: Story | null;
  steps: string[];
  helpedBefore: Dated[];
  lessonsInAction: LessonInAction[];
  question: string;
};

export function buildAnalyzePrompt(
  rangeLabel: string,
  pages: string,
  older: string,
  lessons: string,
  lang: Lang,
): string {
  return `${VOICE}

Task: ANALYZE ${rangeLabel}. Read every page in the range as a whole and help them see it clearly.
Each item that points at pages lists those days ("YYYY-MM-DD" exactly as shown).
Say each thing once: an item in one list must not come back, in other words, in another list.

Return JSON:
- "overview": 2-3 sentences: how this time was for them, in plain words.
- "gives": up to 3 things that gave them energy. [] if none.
- "takes": up to 3 things that took energy. [] if none.
- "patterns": up to 3 things that came back more than once (a feeling, a situation, a habit)
  and are NOT already in "gives" or "takes". For a single day: the threads that run through
  that day. [] if nothing new repeats.
- "wins": up to 3 things they really did well, even small ones. [] if none.
- "story": if they tell a harsh story about themselves ("I always fail", "nobody cares"):
  {"story": the story in their voice, one sentence; "against": up to 3 facts from their pages or
  older pages that do not fit it, each {"text", "days"}; "truer": one fair sentence truer than the story}.
  null if there is no such story.
- "steps": 1-3 small, concrete things to try next time, built on what happened in this range.
  The first step is about the thing that took the most energy or came back the most.
  Each one sentence, doable within a day or a week.
- "helpedBefore": up to 2 things from older pages or kept lessons that helped in similar moments. [] if none.
- "lessonsInAction": check each kept lesson against the pages in the range. Up to 3 items, each
  {"lesson": the lesson's number, "used": true if they did it (even partly) or false if a moment
  came where it could have helped and they did not use it, "text": one short sentence on that moment,
  "days": the range days where it shows}. Only clear cases from the range pages. No blame when
  "used" is false: just point at the moment. [] if no lesson shows up.
- "question": one open question to write about next.

${replyLanguageRule(lang)}

${lessons ? `Lessons they kept earlier:\n${lessons}` : 'Lessons they kept earlier: none'}

${older ? `Related moments from older pages:\n${older}` : 'Related moments from older pages: none'}

Pages in the range (oldest first):
${pages}`;
}

export const ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    overview: str,
    gives: datedList,
    takes: datedList,
    patterns: datedList,
    wins: datedList,
    story: {
      type: ['object', 'null'],
      properties: { story: str, against: datedList, truer: str },
      required: ['story', 'against', 'truer'],
    },
    steps: strList,
    helpedBefore: datedList,
    lessonsInAction: {
      type: 'array',
      items: {
        type: 'object',
        properties: { lesson: { type: 'integer' }, used: { type: 'boolean' }, text: str, days: strList },
        required: ['lesson', 'used', 'text', 'days'],
      },
    },
    question: str,
  },
  required: [
    'overview',
    'gives',
    'takes',
    'patterns',
    'wins',
    'story',
    'steps',
    'helpedBefore',
    'lessonsInAction',
    'question',
  ],
};

const MAX_DAYS = 4;

/** Keeps only days that were really sent; an item with no text is dropped. */
function cleanDated(raw: unknown, knownDays: ReadonlySet<string>, max = 3, needDay = false): Dated[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const days = Array.isArray((x as Dated)?.days) ? (x as Dated).days : [];
      return {
        text: clean((x as Dated)?.text, 400),
        // The newest few days are enough to point at; a long list is noise.
        days: [...new Set(days.map((d) => clean(d, 10)).filter((d) => knownDays.has(d)))].sort().slice(-MAX_DAYS),
      };
    })
    .filter((x) => x.text && (!needDay || x.days.length > 0))
    .slice(0, max);
}

/**
 * knownDays: every day sent (range, older blocks, lessons). lessons: the kept
 * lesson texts in the order sent. rangeDays: days inside the range, the only
 * ones a lesson-in-action may point at.
 */
function cleanLessonsInAction(raw: unknown, lessons: readonly string[], rangeDays: ReadonlySet<string>): LessonInAction[] {
  if (!Array.isArray(raw)) return [];
  const out: LessonInAction[] = [];
  for (const item of raw) {
    const x = (item ?? {}) as Record<string, unknown>;
    const n = x.lesson;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n >= lessons.length) continue;
    const [dated] = cleanDated([{ text: x.text, days: x.days }], rangeDays, 1, true);
    if (!dated || typeof x.used !== 'boolean') continue;
    out.push({ lesson: lessons[n], used: x.used, ...dated });
  }
  return out.slice(0, 3);
}

export function parseAnalysis(
  raw: string,
  knownDays: ReadonlySet<string>,
  lessons: readonly string[] = [],
  rangeDays: ReadonlySet<string> = knownDays,
): AnalysisResult {
  const j = JSON.parse(raw) as Record<string, unknown>;
  const overview = clean(j.overview, 800);
  if (!overview) throw new Error('analyze: empty overview');
  const s = (j.story ?? null) as Record<string, unknown> | null;
  const storyText = s ? clean(s.story, 300) : '';
  const truer = s ? clean(s.truer, 400) : '';
  const steps = Array.isArray(j.steps) ? j.steps.map((x) => clean(x, 300)).filter(Boolean).slice(0, 3) : [];
  return {
    overview,
    gives: cleanDated(j.gives, knownDays),
    takes: cleanDated(j.takes, knownDays),
    patterns: cleanDated(j.patterns, knownDays),
    wins: cleanDated(j.wins, knownDays),
    story: storyText && truer ? { story: storyText, against: cleanDated(s?.against, knownDays, 3, true), truer } : null,
    steps,
    // A "helped before" with no real day is a guess: dropped.
    helpedBefore: cleanDated(j.helpedBefore, knownDays, 2, true),
    lessonsInAction: cleanLessonsInAction(j.lessonsInAction, lessons, rangeDays),
    question: clean(j.question, 300),
  };
}

// ---- Daily question pick ----

export function buildPickPrompt(recent: string, candidates: readonly string[]): string {
  return `${VOICE}

Task: PICK TODAY'S QUESTION. Read their last few days. Choose the ONE question from the list
that fits best right now: something they keep circling, avoiding, or that would help them most.
Prefer a gentle question if the days look heavy. Do not pick a question they answered in these days.

Return JSON: {"index": number} - the number from the list.

Questions:
${candidates.map((q, i) => `${i}. ${q}`).join('\n')}

Their last days (newest first):
${recent}`;
}

export const PICK_SCHEMA = {
  type: 'object',
  properties: { index: { type: 'integer' } },
  required: ['index'],
};

export function parsePick(raw: string, candidates: readonly string[]): string {
  const i = (JSON.parse(raw) as Record<string, unknown>).index;
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= candidates.length) {
    throw new Error('pick: bad index');
  }
  return candidates[i];
}

export function checkCandidates(raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new Error('bad candidates');
  const list = raw.filter((q): q is string => typeof q === 'string' && q.trim() !== '' && q.length <= 300);
  if (list.length === 0 || list.length > 200) throw new Error('bad candidates');
  return list;
}

// ---- Follow-ups (PLAN-ai #8): promises to ask about once, a few days later ----

export type Intention = { day: string; text: string; askOn: string; question: string };

/** Default wait before asking, when the page gives no time ("next week" = 7). */
export const FOLLOW_UP_DAYS = 3;

export function buildIntentionsPrompt(pages: string, open: readonly string[], lang: Lang): string {
  return `You read someone's private journal pages and find clear promises to themselves:
things they said they WILL do ("tomorrow I will...", "tuần sau mình sẽ...", "I promised mom I'd...").
- Only real, concrete plans. Not wishes ("I wish..."), not habits, not things already done.
- Skip anything already in the open list below.
- At most 3, the most important first. [] is a fine answer.

For each, return:
- "day": the page date it was written on, exactly as shown.
- "text": the promise in a few words.
- "askOn": "YYYY-MM-DD", the day to gently ask about it. Default: ${FOLLOW_UP_DAYS} days after "day".
  "tomorrow" = 2 days after "day"; "next week" = 7 days after "day"; a named date = the day after that date.
- "question": one short, kind question asking if they did it. No pressure, no judgment. Under 15 words.

${replyLanguageRule(lang)}

Return JSON: {"intentions": [...]}

Already open (do not repeat):
${open.length ? open.map((t) => `- ${t}`).join('\n') : '- none'}

Pages (newest first):
${pages}`;
}

export const INTENTIONS_SCHEMA = {
  type: 'object',
  properties: {
    intentions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { day: str, text: str, askOn: str, question: str },
        required: ['day', 'text', 'askOn', 'question'],
      },
    },
  },
  required: ['intentions'],
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keeps promises from real pages. askOn must be 1-60 days after the page,
 * otherwise it falls back to FOLLOW_UP_DAYS. addDays is passed in to keep
 * this file free of date code.
 */
export function parseIntentions(
  raw: string,
  knownDays: ReadonlySet<string>,
  addDays: (day: string, n: number) => string,
): Intention[] {
  const list = (JSON.parse(raw) as Record<string, unknown>).intentions;
  if (!Array.isArray(list)) return [];
  const out: Intention[] = [];
  for (const item of list) {
    const it = (item ?? {}) as Record<string, unknown>;
    const day = clean(it.day, 10);
    const text = clean(it.text, 200);
    const question = clean(it.question, 200).replace(/\s+/g, ' ');
    if (!knownDays.has(day) || !text || !question) continue;
    let askOn = clean(it.askOn, 10);
    if (!DAY_RE.test(askOn) || askOn <= day || askOn > addDays(day, 60)) askOn = addDays(day, FOLLOW_UP_DAYS);
    out.push({ day, text, askOn, question });
  }
  return out.slice(0, 3);
}

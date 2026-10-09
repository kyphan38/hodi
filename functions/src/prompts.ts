// ============================================================
// Prompts and result checks for "reflect" and "next time".
// Logic (PLAN-ai): listen first, advise only when asked. Advice is small,
// concrete, in the writer's control, and built on their own past pages.
// Pure file: the root test suite imports it.
// ============================================================

import { replyLanguageRule, type Lang } from './lang.ts';

export type BlockInput = { day: string; time: string | null; question: string | null; body: string };

export type HelpedBefore = { day: string; text: string };

export type ReflectResult = { mirror: string; question: string; steps: string[] };

export type NextTimeResult = {
  happened: string;
  didWell: string | null;
  steps: string[];
  helpedBefore: HelpedBefore[];
};

export const MAX_BODY = 8_000;

const VOICE = `You are a calm, honest friend reading someone's private journal.
Rules:
- Short sentences. Plain words. No therapy jargon, no diagnosis.
- Never say "you should". Use "you could try" or "one option is".
- No generic tips (sleep more, breathe deeply, drink water) unless their own pages show it helped them.
- No blame and no flattery. Do not praise what was not really good.
- If the problem is outside their control, say so and only suggest what they can control.
- If the text shows a wish to hurt themselves or die: do not analyse. Say gently that you are glad they wrote it down, and suggest talking to a real person they trust today or calling 115. Return no steps.
- Use their past pages and kept lessons only when they truly fit. Quote dates exactly as given.`;

function blockText(b: BlockInput): string {
  return (b.question ? `Question: ${b.question}\n` : '') + `Text:\n${b.body.trim()}`;
}

function contextText(past: string, lessons: string): string {
  return [
    lessons ? `Lessons they kept earlier:\n${lessons}` : 'Lessons they kept earlier: none',
    past ? `Their past pages (newest first):\n${past}` : 'Their past pages: none',
  ].join('\n\n');
}

export function buildReflectPrompt(b: BlockInput, past: string, lessons: string, lang: Lang): string {
  return `${VOICE}

Task: REFLECT. Help them feel heard. Do not give advice, unless the text itself asks for it
(for example "what should I do?", "mình nên làm gì?"). Only then add 1 to 3 small steps.

Return JSON:
- "mirror": 1-2 sentences that say back what they seem to feel and why, in your own words.
- "question": one open question that helps them look a bit deeper.
- "steps": [] unless they asked for advice; then 1-3 short steps.

${replyLanguageRule(lang)}

${contextText(past, lessons)}

Today is ${b.day}. The part they want you to read:
${blockText(b)}`;
}

export function buildNextTimePrompt(b: BlockInput, past: string, lessons: string, lang: Lang): string {
  return `${VOICE}

Task: NEXT TIME. They wrote about something they did or something that went badly, and they
asked what they could do better if it happens again.

Return JSON:
- "happened": one sentence with the facts only, separate from the feelings.
- "didWell": one thing they really did well, or null if there is none.
- "steps": 1 to 3 small, concrete things to try next time. Each one sentence. Each doable within a day or a week.
- "helpedBefore": up to 2 items from their lessons or past pages that helped in a similar case.
  Each: {"day": "YYYY-MM-DD" exactly as shown, "text": one short sentence}. [] if nothing fits.

${replyLanguageRule(lang)}

${contextText(past, lessons)}

Today is ${b.day}. The part they want you to read:
${blockText(b)}`;
}

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;

export const REFLECT_SCHEMA = {
  type: 'object',
  properties: { mirror: str, question: str, steps: strList },
  required: ['mirror', 'question', 'steps'],
};

export const NEXT_TIME_SCHEMA = {
  type: 'object',
  properties: {
    happened: str,
    didWell: { type: ['string', 'null'] },
    steps: strList,
    helpedBefore: {
      type: 'array',
      items: { type: 'object', properties: { day: str, text: str }, required: ['day', 'text'] },
    },
  },
  required: ['happened', 'didWell', 'steps', 'helpedBefore'],
};

function clean(s: unknown, max = 600): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

function cleanSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => clean(s, 300)).filter(Boolean).slice(0, 3);
}

export function parseReflect(raw: string): ReflectResult {
  const j = JSON.parse(raw) as Record<string, unknown>;
  const mirror = clean(j.mirror);
  if (!mirror) throw new Error('reflect: empty mirror');
  return { mirror, question: clean(j.question, 300), steps: cleanSteps(j.steps) };
}

/** knownDays: days that were really in the context, so a made-up date is dropped. */
export function parseNextTime(raw: string, knownDays: ReadonlySet<string>): NextTimeResult {
  const j = JSON.parse(raw) as Record<string, unknown>;
  const happened = clean(j.happened);
  if (!happened) throw new Error('nextTime: empty happened');
  const didWell = clean(j.didWell) || null;
  const helped = Array.isArray(j.helpedBefore) ? j.helpedBefore : [];
  const helpedBefore = helped
    .map((h) => ({ day: clean((h as HelpedBefore)?.day, 10), text: clean((h as HelpedBefore)?.text, 300) }))
    .filter((h) => h.text && knownDays.has(h.day))
    .slice(0, 2);
  return { happened, didWell, steps: cleanSteps(j.steps), helpedBefore };
}

export function checkBlock(raw: unknown): BlockInput {
  const b = (raw ?? {}) as Record<string, unknown>;
  const day = typeof b.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.day) ? b.day : null;
  const body = typeof b.body === 'string' ? b.body : '';
  if (!day || !body.trim() || body.length > MAX_BODY) throw new Error('bad block');
  const time = typeof b.time === 'string' && /^\d{2}:\d{2}$/.test(b.time) ? b.time : null;
  const question = typeof b.question === 'string' && b.question.trim() ? b.question.slice(0, 300) : null;
  return { day, time, question, body };
}

// ---- Look back (weekly / monthly review) ----

export type Pattern = { text: string; days: string[] };
export type LookBackResult = { patterns: Pattern[]; question: string };

export function buildLookBackPrompt(
  periodLabel: string,
  pages: string,
  lessons: string,
  lang: Lang,
): string {
  return `${VOICE}

Task: LOOK BACK over ${periodLabel}. Find what repeats. Do not give advice.

Return JSON:
- "patterns": 2 or 3 things that came back more than once: a feeling, a situation, a habit, what gave or took energy.
  Each: {"text": one or two short sentences, concrete, "days": the dates ("YYYY-MM-DD" exactly as shown) where it shows up}.
  If a kept lesson was used (or forgotten) in this period, that can be one pattern.
  Fewer patterns is fine when the pages are few. Never invent one.
- "question": one open question for writing the review.

${replyLanguageRule(lang)}

${lessons ? `Lessons they kept earlier:\n${lessons}` : 'Lessons they kept earlier: none'}

Their pages in this period (oldest first):
${pages}`;
}

export const LOOK_BACK_SCHEMA = {
  type: 'object',
  properties: {
    patterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: str, days: strList },
        required: ['text', 'days'],
      },
    },
    question: str,
  },
  required: ['patterns', 'question'],
};

/** Keeps only days really in the period; a pattern needs text. */
export function parseLookBack(raw: string, knownDays: ReadonlySet<string>): LookBackResult {
  const j = JSON.parse(raw) as Record<string, unknown>;
  const list = Array.isArray(j.patterns) ? j.patterns : [];
  const patterns = list
    .map((p) => {
      const days = Array.isArray((p as Pattern)?.days) ? (p as Pattern).days : [];
      return {
        text: clean((p as Pattern)?.text),
        days: [...new Set(days.map((d) => clean(d, 10)).filter((d) => knownDays.has(d)))].sort(),
      };
    })
    .filter((p) => p.text)
    .slice(0, 3);
  if (patterns.length === 0) throw new Error('lookBack: no patterns');
  return { patterns, question: clean(j.question, 300) };
}

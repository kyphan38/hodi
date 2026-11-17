// hodi - Pure parts of the newer AI tools: voice to text (H2), year summary (H4),
// a theme over time (H8), and a kept lesson that fits a block (H9).
// The root test suite imports this file: no firebase-admin, no network.

import { replyLanguageRule, type Lang } from './lang.ts';

// ------------------------------------------------------------------ H2: voice

/** Base64 chars (~6 MB, about 3 minutes of Opus / AAC). */
export const MAX_AUDIO_BASE64 = 8_000_000;
export const AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

export function checkVoice(data: unknown): { audio: string; mimeType: string } {
  const d = (data ?? {}) as { audio?: unknown; mimeType?: unknown };
  if (typeof d.audio !== 'string' || d.audio.length === 0) throw new Error('No audio');
  if (d.audio.length > MAX_AUDIO_BASE64) throw new Error('Audio too long');
  if (!/^[A-Za-z0-9+/=]+$/.test(d.audio)) throw new Error('Bad audio data');
  const mimeType = typeof d.mimeType === 'string' ? d.mimeType.split(';')[0].trim().toLowerCase() : '';
  if (!AUDIO_TYPES.includes(mimeType)) throw new Error('Unsupported audio type');
  return { audio: d.audio, mimeType };
}

export const VOICE_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };

export const VOICE_PROMPT = [
  'Write down this recording word for word. Someone is speaking into their private journal, in Vietnamese, English, or both mixed.',
  'Rules:',
  '- Keep the exact words and the language they were said in. Do not fix, translate, shorten, summarize or add anything.',
  '- Keep every Vietnamese diacritic.',
  '- Add normal punctuation and capital letters where a sentence starts.',
  '- If the speaker says "xuống dòng" or "new line", start a new line there. If they say "đoạn mới" or "new paragraph", leave one blank line there. Do not write those words.',
  '- Leave out filler sounds (ờ, ừm, uh, um) and false starts.',
  '- If there is no speech, return an empty text.',
].join('\n');

export function parseVoice(raw: string): string {
  try {
    const t = (JSON.parse(raw) as { text?: unknown })?.text;
    return typeof t === 'string' ? t.normalize('NFC').trim().slice(0, 10_000) : '';
  } catch {
    return '';
  }
}

// ------------------------------------------------------------------ H4: year

export function checkYear(raw: unknown, now: number): string {
  const y = typeof raw === 'string' ? raw : '';
  if (!/^\d{4}$/.test(y)) throw new Error('Bad year');
  const n = Number(y);
  const current = new Date(now).getUTCFullYear();
  if (n < 2000 || n > current) throw new Error('Bad year');
  return y;
}

export function buildYearPrompt(year: string, monthSummaries: string, lang: Lang): string {
  return `You help someone look back on one year of their private journal (${year}).
Below are summaries of each month they wrote in. Write a warm, honest look back, 250-400 words:
- how the year went, in 2-3 sentences;
- the big changes and turning points, with the month in brackets, for example (2026-03);
- what kept coming back all year;
- what gave them energy and what took it;
- what went well that they may have forgotten;
- one or two questions to carry into next year.
No advice lists, no judgment, no diagnosis. Use only what the summaries say.
${replyLanguageRule(lang)}
Plain text with short paragraphs; no Markdown headings.

Month summaries:
${monthSummaries}`;
}

// ------------------------------------------------------------------ H8: a theme over time

export const THEME_LIMIT = 40;
export const THEME_MIN_SCORE = 0.5;

export function checkTheme(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.normalize('NFC').trim().slice(0, 200) : '';
  if (t.length < 2) throw new Error('Empty theme');
  return t;
}

export type ThemeBlock = { day: string; text: string };

export function buildThemePrompt(theme: string, blocks: ThemeBlock[], lang: Lang): string {
  return `Someone asks how one theme shows up in their private journal over time: "${theme}".
Below are the journal blocks about it, oldest first, each with its date.
Write 3-5 sentences: how this theme changed over time, what stayed the same, and where it stands in the latest blocks.
Put the date (YYYY-MM-DD) in brackets after a point, for example (2026-07-14). Use only what the blocks say.
No advice, no judgment. ${replyLanguageRule(lang)}

Blocks:
${blocks.map((b) => `[${b.day}] ${b.text}`).join('\n\n')}`;
}

/** Hits about the theme, oldest first, one entry per block (a day may have several). */
export function themeBlocks<T extends { day: string; text: string; score: number }>(hits: T[]): T[] {
  return hits.filter((h) => h.score >= THEME_MIN_SCORE).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

// ------------------------------------------------------------------ H9: a lesson for a block

/** A lesson is shown only when it is this close in meaning (cosine similarity). */
export const LESSON_MIN_SIMILARITY = 0.62;

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** The closest lesson to the block, or null when none is close enough. */
export function bestLesson<T>(block: number[], lessons: { item: T; vector: number[] }[]): T | null {
  let best: { item: T; sim: number } | null = null;
  for (const l of lessons) {
    const sim = cosine(block, l.vector);
    if (!best || sim > best.sim) best = { item: l.item, sim };
  }
  return best && best.sim >= LESSON_MIN_SIMILARITY ? best.item : null;
}

export function checkBlock(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (t.length < 20) throw new Error('Too short');
  return t.slice(0, 4000);
}

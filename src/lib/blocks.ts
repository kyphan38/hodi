// ============================================================
// hodi - One day = several blocks, saved as ONE raw text page
//
//   · 08:10
//   › What drained you today?
//   Long meeting, tired.
//
//   · 21:40
//   A good cup of coffee.            ← free write: no question line
//
// Each block: a time line (when the block was started), a question line if
// any, then the text. Blocks are separated by a blank line. Still plain text,
// so export, search, heatmap and word count need no change.
//
// parseBlocks(serializeBlocks(x)) must return exactly x, including blank lines
// at the end of the text being typed - otherwise Enter at the end of a block
// gets "swallowed" on save.
// Pure file.
// ============================================================

import { STAMP_RE, QUESTION_RE } from '@/lib/day';

export type Block = {
  /** 'HH:MM' - null for old text written before blocks existed. */
  time: string | null;
  question: string | null;
  body: string;
};

/** Block boundary: a blank line, then a time line. */
const BOUNDARY = /\n\n(?=· \d{2}:\d{2}(?:\n|$))/;

function parseChunk(chunk: string): Block {
  const lines = chunk.split('\n');
  let time: string | null = null;
  let question: string | null = null;
  let i = 0;
  if (STAMP_RE.test(lines[0] ?? '')) {
    time = lines[0].slice(2);
    i = 1;
  }
  if (QUESTION_RE.test(lines[i] ?? '')) {
    question = lines[i].slice(2);
    i++;
  }
  return { time, question, body: lines.slice(i).join('\n') };
}

export function parseBlocks(text: string): Block[] {
  if (text === '') return [];
  return text.split(BOUNDARY).map(parseChunk);
}

function header(b: Block): string {
  return (b.time ? `· ${b.time}\n` : '') + (b.question ? `› ${b.question}\n` : '');
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map((b) => header(b) + b.body).join('\n\n');
}

/** Questions answered today - so "another" does not suggest them again. */
export function answered(blocks: Block[]): Set<string> {
  return new Set(blocks.filter((b) => b.question).map((b) => b.question as string));
}

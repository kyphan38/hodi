// ============================================================
// hodi - Một ngày = nhiều khối, lưu thành MỘT trang chữ thô
//
//   · 08:10
//   › What drained you today?
//   Họp dài, mệt.
//
//   · 21:40
//   Một tách cà phê ngon.            ← free write: không có dòng câu hỏi
//
// Mỗi khối: dòng giờ (lúc bắt đầu viết khối), dòng câu hỏi nếu có, rồi chữ.
// Các khối cách nhau bằng một dòng trống. Vẫn là text thường, nên export,
// search, heatmap, đếm chữ không phải đổi gì.
//
// parseBlocks(serializeBlocks(x)) phải trả lại đúng x, kể cả dòng trống ở cuối
// chữ đang gõ - nếu không, Enter ở cuối khối sẽ bị "nuốt" khi lưu.
// File thuần.
// ============================================================

import { STAMP_RE, QUESTION_RE } from '@/lib/day';

export type Block = {
  /** 'HH:MM' - null với chữ cũ viết trước khi có khối. */
  time: string | null;
  question: string | null;
  body: string;
};

/** Ranh giới khối: dòng trống rồi một dòng giờ. */
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

/** Các câu hỏi đã trả lời trong ngày - để "another" không gợi lại. */
export function answered(blocks: Block[]): Set<string> {
  return new Set(blocks.filter((b) => b.question).map((b) => b.question as string));
}

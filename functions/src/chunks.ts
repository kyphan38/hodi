// ============================================================
// Search chunks: one per block of a page (same split as src/lib/blocks.ts,
// checked by a test). Pure file: the root test suite imports it.
// ============================================================

export type Chunk = { i: number; time: string | null; question: string | null; text: string; hash: string };

const BOUNDARY = /\n\n(?=· \d{2}:\d{2}(?:\n|$))/;
const STAMP_RE = /^· \d{2}:\d{2}$/;
const QUESTION_RE = /^› \S/;

/** Longer blocks are cut: the start carries most of the meaning, and it keeps calls small. */
export const CHUNK_MAX_CHARS = 2_000;

/** FNV-1a: cheap way to skip blocks that did not change since the last index. */
export function hashText(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function chunkPage(text: string): Chunk[] {
  if (!text.trim()) return [];
  const out: Chunk[] = [];
  text.split(BOUNDARY).forEach((part, i) => {
    const lines = part.split('\n');
    let k = 0;
    let time: string | null = null;
    let question: string | null = null;
    if (STAMP_RE.test(lines[0] ?? '')) time = lines[k++].slice(2);
    if (QUESTION_RE.test(lines[k] ?? '')) question = lines[k++].slice(2);
    const body = lines.slice(k).join('\n').trim();
    if (!body) return;
    const full = (question ? `${question}\n` : '') + body;
    const cut = full.slice(0, CHUNK_MAX_CHARS);
    out.push({ i, time, question, text: cut, hash: hashText(cut) });
  });
  return out;
}

/** Cosine distance (0 = same meaning) to a 0-1 score for the UI. */
export function scoreOf(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance));
}

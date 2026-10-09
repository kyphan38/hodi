// Journal context sent to AI: pages and kept lessons, as plain text.
// Pure file: the root test suite imports it.

export type PastEntry = { date: string; text: string };
export type LessonLite = { text: string; situation: string; sourceDay: string };

/** Hard cap so one call stays cheap and fast. */
export const CONTEXT_MAX_CHARS = 60_000;

/**
 * Pages cut at CONTEXT_MAX_CHARS (the newest are kept), empty pages skipped.
 * Newest first by default; a review reads better oldest first.
 */
export function formatPast(entries: PastEntry[], order: 'newest' | 'oldest' = 'newest'): string {
  const sorted = [...entries].filter((e) => e.text.trim()).sort((a, b) => (a.date < b.date ? 1 : -1));
  const parts: string[] = [];
  let size = 0;
  for (const e of sorted) {
    const part = `### ${e.date}\n${e.text.trim()}`;
    if (size + part.length > CONTEXT_MAX_CHARS) break;
    parts.push(part);
    size += part.length + 2;
  }
  if (order === 'oldest') parts.reverse();
  return parts.join('\n\n');
}

export function formatLessons(lessons: LessonLite[]): string {
  return lessons.map((l) => `- (${l.sourceDay}) ${l.text}${l.situation ? ` [when: ${l.situation}]` : ''}`).join('\n');
}

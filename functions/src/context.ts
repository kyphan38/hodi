// Journal context sent with "reflect" / "next time": past pages and kept lessons.
// Pure file: the root test suite imports it.

export type PastEntry = { date: string; text: string };
export type LessonLite = { text: string; situation: string; sourceDay: string };

/** Days of past pages to send (PLAN-ai: until embeddings exist). */
export const CONTEXT_DAYS = 60;
/** Hard cap so one call stays cheap and fast. */
export const CONTEXT_MAX_CHARS = 60_000;

/** Newest pages first, cut at CONTEXT_MAX_CHARS. Empty pages are skipped. */
export function formatPast(entries: PastEntry[]): string {
  const sorted = [...entries].filter((e) => e.text.trim()).sort((a, b) => (a.date < b.date ? 1 : -1));
  const parts: string[] = [];
  let size = 0;
  for (const e of sorted) {
    const part = `### ${e.date}\n${e.text.trim()}`;
    if (size + part.length > CONTEXT_MAX_CHARS) break;
    parts.push(part);
    size += part.length + 2;
  }
  return parts.join('\n\n');
}

export function formatLessons(lessons: LessonLite[]): string {
  return lessons.map((l) => `- (${l.sourceDay}) ${l.text}${l.situation ? ` [when: ${l.situation}]` : ''}`).join('\n');
}

// ============================================================
// Month summaries for long ranges (PLAN-ai A9): users/{uid}/monthSums/{YYYY-MM}.
// A summary is made once and kept until a page of that month changes
// (sourceAt = newest updatedAt of the month's pages), so a 1-year analysis
// only summarizes the months that are new or changed.
// ============================================================

import type { DocumentReference } from 'firebase-admin/firestore';

import { formatPast, type PastEntry } from './context.ts';
import { generateText } from './gemini.ts';
import { buildMonthSummaryPrompt } from './prompts.ts';

export type DatedEntry = PastEntry & { updatedAt: number };

/** Months summarized at once. */
const PARALLEL = 4;

/** Summaries of the given months, oldest first, as one text. Months with no pages are skipped. */
export async function monthSummaries(
  user: DocumentReference,
  apiKey: string,
  model: string,
  months: string[],
  entries: DatedEntry[],
): Promise<string> {
  const col = user.collection('monthSums');
  const out: string[] = [];
  for (let s = 0; s < months.length; s += PARALLEL) {
    const part = await Promise.all(
      months.slice(s, s + PARALLEL).map(async (month) => {
        const pages = entries.filter((e) => e.date.startsWith(month) && e.text.trim());
        if (pages.length === 0) return '';
        const sourceAt = Math.max(...pages.map((p) => p.updatedAt || 0));
        const ref = col.doc(month);
        const cached = (await ref.get()).data() as { text?: string; sourceAt?: number } | undefined;
        let text = cached?.sourceAt === sourceAt ? (cached.text ?? '') : '';
        if (!text) {
          text = await generateText(apiKey, model, buildMonthSummaryPrompt(month, formatPast(pages, 'oldest', 200_000)), {
            temperature: 0.2,
            timeoutMs: 60_000,
          });
          await ref.set({ month, text, sourceAt, pages: pages.length, createdAt: Date.now() });
        }
        return `### ${month} (summary of the month)\n${text}`;
      }),
    );
    out.push(...part.filter(Boolean));
  }
  return out.join('\n\n');
}

// ============================================================
// hodi - Export to one Markdown file
//
// The data is yours: one .md file any app can read, still readable ten years
// on. Oldest first, like reading a notebook.
// Pure file (the download lives in SettingsView).
// ============================================================

import { dayLong } from '@/lib/day';
import { hasWords, reviewEnd } from '@/lib/journal';
import { askedIn } from '@/lib/questions';
import { reviewTitle } from '@/lib/review';
import type { Entry, Review } from '@/types/hodi';

export function exportFilename(today: string): string {
  return `hodi-${today}.md`;
}

export function buildMarkdown(entries: Entry[], reviews: Review[], today: string): string {
  type Block = { date: string; order: number; md: string };
  const blocks: Block[] = [];

  for (const e of entries) {
    if (!hasWords(e)) continue;
    // The question is already in the page ('› …'), so do not print it again.
    const prompt = e.prompt && askedIn(e.text).size === 0 ? `*${e.prompt}*\n\n` : '';
    blocks.push({ date: e.date, order: 0, md: `## ${dayLong(e.date)}\n\n${prompt}${e.text.trim()}\n` });
  }
  for (const r of reviews) {
    if (!hasWords(r)) continue;
    blocks.push({ date: reviewEnd(r), order: 1, md: `## Review, ${reviewTitle(r.period, true)}\n\n${r.text.trim()}\n` });
  }
  // Oldest first; on the same day the review comes after that day's entry.
  blocks.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));

  const pages = blocks.length;
  const head = `# hodi\n\nExported ${dayLong(today)} · ${pages} ${pages === 1 ? 'page' : 'pages'}\n`;
  return [head, ...blocks.map((b) => b.md)].join('\n');
}

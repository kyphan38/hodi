// ============================================================
// hodi - Export ra một file Markdown
//
// Dữ liệu là của mình: một file .md đọc được bằng bất cứ app nào, mười năm
// sau vẫn mở được. Cũ nhất trước, như đọc một cuốn sổ.
// File thuần (phần tải file nằm ở SettingsView).
// ============================================================

import { dayLong } from '@/lib/day';
import { hasWords, reviewEnd } from '@/lib/journal';
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
    const prompt = e.prompt ? `*${e.prompt}*\n\n` : '';
    blocks.push({ date: e.date, order: 0, md: `## ${dayLong(e.date)}\n\n${prompt}${e.text.trim()}\n` });
  }
  for (const r of reviews) {
    if (!hasWords(r)) continue;
    blocks.push({ date: reviewEnd(r), order: 1, md: `## ${reviewTitle(r.period, true)} — review\n\n${r.text.trim()}\n` });
  }
  // Cũ nhất trước; cùng ngày thì review sau bài của ngày đó.
  blocks.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));

  const pages = blocks.length;
  const head = `# hodi\n\nExported ${dayLong(today)} · ${pages} ${pages === 1 ? 'page' : 'pages'}\n`;
  return [head, ...blocks.map((b) => b.md)].join('\n');
}

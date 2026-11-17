import Link from 'next/link';

import TopBar from '@/components/TopBar';

// hodi - In-app guide. Plain English, one block per feature.
// Keep it in sync when a feature changes.

type Block = { title: string; lines: string[] };

const BLOCKS: Block[] = [
  {
    title: 'The day',
    lines: [
      'A hodi day runs from 04:00 to 04:00. Writing at 1 am still goes on the page before.',
      'Left open past 04:00, the app moves to the new page when you come back.',
    ],
  },
  {
    title: 'Today',
    lines: [
      'A faint question sits at the top. Start typing to answer it.',
      'done (or ⌘Enter) closes the block and shows the next question.',
      'another gives a different question. topic picks the kind of question. free write gives a blank block.',
      'Finished blocks stay above as a short list. Tap one to read and edit it.',
      'voice, next to done: tap to record, tap stop when finished (3 minutes at most). Your words are written into the block as you said them. Works with AI off; needs a connection.',
      'topic also has mine when you have added your own questions in Settings.',
      'Everything saves while you type. done is not save.',
      'When yesterday is blank, a line asks if you want to write it.',
      'On this day shows a few lines from the same date in earlier years.',
      'When a letter you sealed reaches its day, a faint line shows it. Tap to read.',
      'With AI on, after done: if a kept lesson fits what you just wrote, it shows as one faint line under the block.',
    ],
  },
  {
    title: 'Saving',
    lines: [
      'The dot in the corner shows where the text is. Hollow: on this device. Filled: in the cloud.',
      'Tap the dot to see the word count.',
      'Offline, the text waits on the device and goes up when you are back online.',
      'If two devices change the same page, both texts are kept and merged.',
    ],
  },
  {
    title: 'Days',
    lines: [
      'The grid shows a year. A darker cell means more words that day.',
      'Below, every written day and review, newest first. Tap one to open it.',
      'Search finds pages that have all the words you type.',
      'letter: write to your future self and pick when it opens (a month, 6 months, a year, or a date). Until then it stays sealed; you only see how many are waiting. Opened letters can be read again here.',
      'With more than one year of writing, pick a year above the grid.',
    ],
  },
  {
    title: 'A past day',
    lines: [
      'A past day opens for reading. edit (or ⌘E) opens the editor.',
      'Swipe, or press ← and →, to go to the next written day.',
    ],
  },
  {
    title: 'Reviews',
    lines: [
      'On Sunday and Monday, a line on Today invites you to review the week.',
      'At the end and start of a month, it invites a month review.',
      'The review page lists that period\'s pages by first line. Tap one to read it, then write your review below.',
      'From 26 December to 7 January, a line invites you to review the year. The year review lists each month (its review and how many pages), with six questions to guide you.',
    ],
  },
  {
    title: 'Insight',
    lines: [
      'Only when AI is on in Settings.',
      'Pick a range (today, 3 days, 7 days, 30 days or custom), then analyze.',
      'The analysis shows what gives and takes energy, what keeps coming back, what went well, the story, and what to try next time. A day in a list opens that page.',
      'talk: a short chat that starts from the analysis question.',
      'Keep a step to save it as a lesson. Lessons can be edited or archived.',
      'search by meaning finds pages about an idea, even with other words.',
      'a theme over time: type a theme (work, my mother). AI finds every block about it, oldest first, and writes a few sentences on how it changed.',
      'the year: summarize the year looks back on a whole year from your monthly summaries. The latest one is kept.',
      'An analysis is for one day. The next day it moves to history, read only.',
      'new writing since means the analysis is older than your latest writing. Analyze again to update it.',
    ],
  },
  {
    title: 'Privacy',
    lines: [
      'The page blurs when the app is hidden, so the app switcher shows nothing.',
      'Face ID lock: set it up in Settings. After 5 minutes away, the app asks for Face ID.',
    ],
  },
  {
    title: 'Settings',
    lines: [
      'Theme, text size, the daily question and typewriter mode (the line you type stays near the middle).',
      'AI on or off, the AI language, and a check that AI works.',
      'export .md downloads your whole journal as one Markdown file.',
      'A year as a book: print opens a clean page for one year (cover, a new sheet each month, reviews). Choose Save as PDF in the print window.',
      'My questions: add your own questions. They are mixed into the daily question, and topic mine asks only yours. Remove hides one.',
      'Sign out also clears the copy on this device.',
    ],
  },
  {
    title: 'Shortcuts on Mac',
    lines: [
      '⌘S saves now. ⌘Enter is done on Today. ⌘E edits a past day.',
      '/ opens search. Esc leaves the editor, then goes to Today.',
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="paper pb-24">
      <TopBar current={null} left={<Link href="/settings/">settings</Link>} />

      <h1 className="mt-10 text-[15px] text-ink">Guide</h1>

      {BLOCKS.map((b) => (
        <section key={b.title} className="mt-8">
          <h2 className="text-[13px] text-faint">{b.title}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {b.lines.map((line) => (
              <li key={line} className="text-[15px] leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

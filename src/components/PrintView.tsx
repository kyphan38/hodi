'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import ReadText from '@/components/ReadText';
import TopBar from '@/components/TopBar';
import { useJournal } from '@/contexts/JournalContext';
import { bookMonths, bookYears } from '@/lib/book';
import { dayLong, monthLabel } from '@/lib/day';
import { reviewTitle } from '@/lib/review';

/**
 * One year as a book (H6): a cover, then each month on a new sheet with its
 * pages and reviews, the year review last. Print, then "Save as PDF".
 * Screen-only controls carry .no-print.
 */
export default function PrintView() {
  const params = useSearchParams();
  const { entries, reviews, loaded } = useJournal();
  const years = useMemo(() => bookYears(entries), [entries]);
  const year = params.get('y') ?? years[0] ?? '';
  const book = useMemo(() => (year ? bookMonths(year, entries, reviews) : null), [year, entries, reviews]);

  return (
    <main className="paper book">
      <div className="no-print">
        <TopBar current={null} left="print" />
        {loaded && years.length === 0 && <p className="mt-16 text-faint">Nothing written yet.</p>}
        {years.length > 0 && (
          <div className="mt-10 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[15px]">
            {years.map((y) => (
              <Link key={y} href={`/print/?y=${y}`} replace className={y === year ? 'text-ink' : 'text-faint hover:text-muted'}>
                {y}
              </Link>
            ))}
            <button type="button" onClick={() => window.print()} className="ml-auto text-faint hover:text-ink">
              print
            </button>
          </div>
        )}
        <p className="mt-2 text-[13px] text-faint">In the print window, choose Save as PDF.</p>
      </div>

      {book && (book.months.length > 0 || book.yearReview) && (
        <article className="mt-16">
          <section className="book-cover">
            <p className="text-[13px] tracking-[0.2em] text-faint uppercase">hodi</p>
            <h1 className="mt-4 text-[40px] font-light">{year}</h1>
            <p className="mt-2 text-[14px] text-faint">{book.months.reduce((n, m) => n + m.entries.length, 0)} pages</p>
          </section>

          {book.months.map((m) => (
            <section key={m.month} className="book-month">
              <h2 className="text-[13px] tracking-[0.2em] text-faint uppercase">{monthLabel(m.month)}</h2>
              {m.entries.map((e) => (
                <div key={e.date} className="book-page mt-8">
                  <h3 className="text-[13px] text-faint">{dayLong(e.date)}</h3>
                  <div className="mt-2 [--text-size:15px]">
                    <ReadText text={e.text} />
                  </div>
                </div>
              ))}
              {m.reviews.map((r) => (
                <div key={r.period} className="book-page mt-8">
                  <h3 className="text-[13px] text-faint">Review, {reviewTitle(r.period, true)}</h3>
                  <div className="mt-2 [--text-size:15px]">
                    <ReadText text={r.text} />
                  </div>
                </div>
              ))}
            </section>
          ))}

          {book.yearReview && (
            <section className="book-month">
              <h2 className="text-[13px] tracking-[0.2em] text-faint uppercase">{reviewTitle(book.yearReview.period)}</h2>
              <div className="mt-4 [--text-size:15px]">
                <ReadText text={book.yearReview.text} />
              </div>
            </section>
          )}
        </article>
      )}
    </main>
  );
}

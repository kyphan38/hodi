'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { dayLong } from '@/lib/day';
import { buildHeatmap, type HeatCell } from '@/lib/journal';
import type { Entry } from '@/types/hodi';

// Độ đậm của mực theo mức. Đơn sắc: chỉ đổi độ mờ, không đổi màu.
const ALPHA = [0.07, 0.24, 0.44, 0.68, 0.92];
const CELL = 9;
const GAP = 2;

function cellStyle(c: HeatCell) {
  return {
    width: CELL,
    height: CELL,
    background: c.future ? 'transparent' : `rgb(var(--heat) / ${ALPHA[c.level]})`,
  };
}

/**
 * Lưới kiểu GitHub cho một năm: ô đậm = ngày viết nhiều. Nhìn là biết giai
 * đoạn nào viết đều, giai đoạn nào bỏ bê. Chạm/bấm một ô → mở ngày đó.
 * Hẹp hơn màn hình thì cuộn ngang, mặc định đứng ở tuần mới nhất.
 */
export default function Heatmap({ entries, today }: { entries: Entry[]; today: string }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const { weeks, months } = useMemo(() => buildHeatmap(entries, today), [entries, today]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const step = CELL + GAP;

  return (
    <figure className="m-0">
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <div style={{ width: weeks.length * step - GAP }}>
          <div className="relative h-4 font-mono text-[10px] text-faint" aria-hidden>
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute top-0" style={{ left: m.col * step }}>
                {m.label}
              </span>
            ))}
          </div>
          <div
            role="group"
            aria-label="Writing activity, last 12 months"
            className="grid grid-flow-col"
            style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP }}
            onClick={(e) => {
              const date = (e.target as HTMLElement).dataset.date;
              if (date) router.push(`/day/?d=${date}`);
            }}
          >
            {weeks.flat().map((c) =>
              c.future ? (
                <span key={c.date} style={cellStyle(c)} />
              ) : (
                <span
                  key={c.date}
                  data-date={c.date}
                  title={`${dayLong(c.date)} · ${c.words} ${c.words === 1 ? 'word' : 'words'}`}
                  className="cursor-pointer rounded-[2px]"
                  style={cellStyle(c)}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <figcaption className="mt-2 flex items-center justify-end gap-1 font-mono text-[10px] text-faint">
        <span className="mr-1">less</span>
        {ALPHA.map((a) => (
          <span key={a} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: `rgb(var(--heat) / ${a})` }} />
        ))}
        <span className="ml-1">more</span>
      </figcaption>
    </figure>
  );
}

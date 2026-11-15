'use client';

import { useState } from 'react';

import { link } from '@/components/insight/styles';
import { makeRange, splitRange, UNIT_MAX, type Unit } from '@/lib/ranges';
import type { Range } from '@/types/hodi';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'd', label: 'days' },
  { value: 'm', label: 'months' },
  { value: 'y', label: 'years' },
];

/** A number and a unit, e.g. 3 months. Limits match the server (lib/ranges). */
export default function CustomPicker({ initial, onSet }: { initial: Range | null; onSet: (r: Range) => void }) {
  const start = initial ? splitRange(initial) : null;
  const [n, setN] = useState(String(start?.n ?? 3));
  const [unit, setUnit] = useState<Unit>(start?.unit ?? 'm');
  const range = makeRange(Number(n), unit);
  return (
    <form
      className="mt-4 flex flex-wrap items-baseline gap-4 text-[15px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (range) onSet(range);
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={UNIT_MAX[unit]}
        value={n}
        onChange={(e) => setN(e.target.value)}
        aria-label="Number"
        className="w-14 appearance-none border-b border-line bg-transparent pb-1 text-center focus:border-faint focus-visible:outline-none"
      />
      <div className="flex gap-3" role="radiogroup" aria-label="Unit">
        {UNITS.map((u) => (
          <button
            key={u.value}
            type="button"
            role="radio"
            aria-checked={u.value === unit}
            onClick={() => setUnit(u.value)}
            className={u.value === unit ? 'text-ink' : 'text-faint hover:text-muted'}
          >
            {u.label}
          </button>
        ))}
      </div>
      <button type="submit" disabled={!range} className={`${link} disabled:opacity-40`}>
        {range ? 'set' : `max ${UNIT_MAX[unit]}`}
      </button>
    </form>
  );
}

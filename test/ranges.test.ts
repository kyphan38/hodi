import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeRange, rangeLabel, splitRange } from '@/lib/ranges';
import { monthsIn, parseRange, rangeDays } from '../functions/src/dates.ts';

test('rangeLabel reads like the chips', () => {
  assert.equal(rangeLabel('today'), 'today');
  assert.equal(rangeLabel('3d'), '3 days');
  assert.equal(rangeLabel('1m'), '1 month');
  assert.equal(rangeLabel('2y'), '2 years');
});

test('makeRange keeps the same limits as the server', () => {
  for (const [n, u] of [[1, 'd'], [90, 'd'], [24, 'm'], [5, 'y']] as const) {
    const r = makeRange(n, u);
    assert.ok(r && parseRange(r) === r, `${n}${u}`);
  }
  for (const [n, u] of [[0, 'd'], [91, 'd'], [25, 'm'], [6, 'y'], [1.5, 'm']] as const) {
    assert.equal(makeRange(n, u), null);
    assert.equal(parseRange(`${n}${u}`), null);
  }
  assert.deepEqual(splitRange('12m'), { n: 12, unit: 'm' });
  assert.equal(splitRange('today'), null);
});

test('month and year ranges end today and start the day after', () => {
  assert.deepEqual(rangeDays('3m', '2026-10-09'), ['2026-07-10', '2026-10-09']);
  assert.deepEqual(rangeDays('1y', '2026-10-09'), ['2025-10-10', '2026-10-09']);
  assert.deepEqual(rangeDays('1m', '2026-03-31'), ['2026-03-01', '2026-03-31']);
  assert.deepEqual(rangeDays('45d', '2026-10-09'), ['2026-08-26', '2026-10-09']);
});

test('monthsIn lists every touched month across years', () => {
  assert.deepEqual(monthsIn('2025-11-20', '2026-02-03'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.deepEqual(monthsIn('2026-10-01', '2026-10-09'), ['2026-10']);
});

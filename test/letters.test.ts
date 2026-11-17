import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMonths, openOnFor, readyLetters, validOpenOn, waitingLetters } from '@/lib/letter-dates';

test('letter dates: months ahead, short months, choices, validity', () => {
  assert.equal(addMonths('2026-11-17', 1), '2026-12-17');
  assert.equal(addMonths('2026-12-17', 1), '2027-01-17');
  assert.equal(addMonths('2027-01-31', 1), '2027-02-28');
  assert.equal(openOnFor('2026-11-17', '6m'), '2027-05-17');
  assert.equal(openOnFor('2026-11-17', '1y'), '2027-11-17');
  assert.equal(validOpenOn('2026-11-17', '2026-11-17'), false);
  assert.equal(validOpenOn('2026-11-17', '2026-11-18'), true);
  assert.equal(validOpenOn('2026-11-17', 'soon'), false);
});

test('ready and waiting letters', () => {
  const l = (openOn: string, openedAt: number | null, createdAt: number) => ({ openOn, openedAt, createdAt });
  const all = [l('2026-11-17', null, 2), l('2026-11-10', null, 1), l('2026-11-01', 5, 0), l('2027-01-01', null, 3)];
  assert.deepEqual(readyLetters(all, '2026-11-17').map((x) => x.createdAt), [1, 2]);
  assert.deepEqual(waitingLetters(all, '2026-11-17').map((x) => x.openOn), ['2027-01-01']);
});

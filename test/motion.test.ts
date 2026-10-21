import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reducedMotion } from '@/lib/motion';

test('reducedMotion: true in Node, where matchMedia does not exist', () => {
  assert.equal(reducedMotion(), true);
});

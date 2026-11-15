import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOCK_AFTER_MS, shouldLock } from '@/lib/lock';

const NOW = 1_800_000_000_000;

test('locks only when a passkey is set and the app was away long enough', () => {
  assert.equal(shouldLock('cred', String(NOW - LOCK_AFTER_MS), NOW), true);
  assert.equal(shouldLock('cred', String(NOW - LOCK_AFTER_MS + 1), NOW), false);
  assert.equal(shouldLock('', String(NOW - LOCK_AFTER_MS * 10), NOW), false);
  assert.equal(shouldLock('cred', '', NOW), false);
});

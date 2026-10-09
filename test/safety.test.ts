import assert from 'node:assert/strict';
import { test } from 'node:test';

import { needsSupport } from '@/lib/safety';

test('needsSupport finds English and Vietnamese phrases', () => {
  assert.equal(needsSupport('Some days I want to die.'), true);
  assert.equal(needsSupport('Hôm nay mình MUỐN CHẾT luôn'), true);
  assert.equal(needsSupport('khong muon song nua'), true);
});

test('needsSupport ignores ordinary text', () => {
  assert.equal(needsSupport('Long meeting, tired. Tu tu roi se on.'), false);
  assert.equal(needsSupport('Từ từ thôi, không sao.'), false);
  assert.equal(needsSupport(''), false);
});

test('needsSupport matches decomposed Vietnamese (NFD input)', () => {
  assert.equal(needsSupport('tự tử'.normalize('NFD')), true);
});

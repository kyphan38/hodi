import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAllowed } from '../functions/src/access.ts';
import { parseLang, replyLanguageRule } from '../functions/src/lang.ts';

test('isAllowed needs the same email, verified', () => {
  assert.equal(isAllowed({ email: 'Me@X.com', email_verified: true }, 'me@x.com'), true);
  assert.equal(isAllowed({ email: 'me@x.com', email_verified: false }, 'me@x.com'), false);
  assert.equal(isAllowed({ email: 'other@x.com', email_verified: true }, 'me@x.com'), false);
  assert.equal(isAllowed(undefined, 'me@x.com'), false);
});

test('isAllowed refuses everyone when the allowed email is empty', () => {
  assert.equal(isAllowed({ email: '', email_verified: true }, ''), false);
});

test('parseLang defaults to Vietnamese', () => {
  assert.equal(parseLang('en'), 'en');
  assert.equal(parseLang('vi'), 'vi');
  assert.equal(parseLang(undefined), 'vi');
  assert.equal(parseLang('fr'), 'vi');
});

test('replyLanguageRule names the language', () => {
  assert.match(replyLanguageRule('vi'), /Vietnamese/);
  assert.match(replyLanguageRule('en'), /English/);
});

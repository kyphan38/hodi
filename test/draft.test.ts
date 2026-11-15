import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { installFakeStorage } from './fake-storage.ts';
import { markDraftSynced, readDraft, writeDraft } from '@/lib/draft';
import { clearHodiStorage } from '@/lib/store';

let ls: Record<string, string>;
beforeEach(() => {
  ls = installFakeStorage();
});

test('a draft written on each keystroke reads back the same', () => {
  writeDraft('u/entries/2026-11-15', { text: 'Hôm nay mưa.', at: 1, synced: false });
  assert.deepEqual(readDraft('u/entries/2026-11-15'), { text: 'Hôm nay mưa.', at: 1, synced: false });
});

test('writing a page drops synced drafts of other pages, never unsynced ones', () => {
  writeDraft('u/entries/2026-11-13', { text: 'saved', at: 1, synced: true });
  writeDraft('u/entries/2026-11-14', { text: 'offline, not saved yet', at: 2, synced: false });
  writeDraft('u/entries/2026-11-15', { text: 'today', at: 3, synced: false });
  assert.equal(readDraft('u/entries/2026-11-13'), null);
  assert.equal(readDraft('u/entries/2026-11-14')?.text, 'offline, not saved yet');
  assert.equal(readDraft('u/entries/2026-11-15')?.text, 'today');
});

test('a draft is marked synced only when the server has the same text', () => {
  writeDraft('u/entries/d', { text: 'abc', at: 1, synced: false });
  markDraftSynced('u/entries/d', 'ab');
  assert.equal(readDraft('u/entries/d')?.synced, false);
  markDraftSynced('u/entries/d', 'abc');
  assert.equal(readDraft('u/entries/d')?.synced, true);
});

test('a broken draft reads as none instead of crashing', () => {
  ls['hodi.draft.u/entries/bad'] = '{not json';
  assert.equal(readDraft('u/entries/bad'), null);
});

test('sign out clears every hodi key and nothing else', () => {
  writeDraft('u/entries/d', { text: 'x', at: 1, synced: false });
  ls['hodi.theme'] = 'dark';
  ls['other.app'] = 'keep';
  clearHodiStorage();
  assert.deepEqual(Object.keys(ls), ['other.app']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { START_HINT_LABEL, shouldShowStartHint, startHintStoredValue } from './start-hint.js';

test('the pointing hand is only for the first visit', () => {
  assert.equal(shouldShowStartHint(null), true);
  assert.equal(shouldShowStartHint(''), true);
  assert.equal(shouldShowStartHint('0'), true);
  assert.equal(shouldShowStartHint('1'), false);
  assert.equal(startHintStoredValue(), '1');
  assert.equal(shouldShowStartHint(startHintStoredValue()), false);
});

test('the hint invites a start with one light touch', () => {
  assert.ok(START_HINT_LABEL.length <= 8);
  assert.match(START_HINT_LABEL, /圓鼓/);
  assert.match(START_HINT_LABEL, /開始/);
  assert.doesNotMatch(START_HINT_LABEL, /開機/);
});

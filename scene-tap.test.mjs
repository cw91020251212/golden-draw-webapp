import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneTapAction } from './scene-tap.js';

test('the first drum tap starts the automatic batch immediately', () => {
  assert.equal(sceneTapAction({ machineOn: false, drawing: false, blocked: false }), 'draw');
});

test('a tap during the automatic batch skips the next ball, unless blocked', () => {
  assert.equal(sceneTapAction({ machineOn: true, drawing: true, blocked: false }), 'skip');
  assert.equal(sceneTapAction({ machineOn: true, drawing: true, blocked: true }), 'ignore');
});

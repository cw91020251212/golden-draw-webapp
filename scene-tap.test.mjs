import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneTapAction } from './scene-tap.js';

test('the first drum tap only powers the machine on', () => {
  assert.equal(sceneTapAction({ machineOn: false, drawing: false, blocked: false }), 'power');
});

test('the second drum tap starts the draw, and a later tap skips a ball', () => {
  assert.equal(sceneTapAction({ machineOn: true, drawing: false, blocked: false }), 'draw');
  assert.equal(sceneTapAction({ machineOn: true, drawing: true, blocked: false }), 'skip');
  assert.equal(sceneTapAction({ machineOn: true, drawing: true, blocked: true }), 'ignore');
});

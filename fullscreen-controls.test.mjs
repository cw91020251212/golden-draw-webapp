import test from 'node:test';
import assert from 'node:assert/strict';
import { fullscreenButtonState, shouldShowStageActions } from './fullscreen-controls.js';

test('wide tablet does not show duplicate scene controls outside immersive mode', () => {
  assert.equal(shouldShowStageActions({ drawActive: true, compactViewport: false }), false);
});

test('compact live draw keeps its accessible stage controls', () => {
  assert.equal(shouldShowStageActions({ drawActive: true, compactViewport: true }), true);
});

test('immersive mode exposes the stage action bar at every viewport size', () => {
  assert.equal(shouldShowStageActions({ immersive: true, compactViewport: false }), true);
  assert.equal(shouldShowStageActions({ immersive: true, compactViewport: true }), true);
});

test('stage controls stay hidden at idle unless the user enters immersive mode', () => {
  assert.equal(shouldShowStageActions({}), false);
  assert.equal(shouldShowStageActions({ immersive: true }), true);
});

test('fullscreen button text and accessibility state track entry and exit', () => {
  assert.deepEqual(fullscreenButtonState(false), {
    text: '全螢幕', ariaLabel: '進入全螢幕', pressed: 'false'
  });
  assert.deepEqual(fullscreenButtonState(true), {
    text: '退出全螢幕', ariaLabel: '退出全螢幕或沉浸模式', pressed: 'true'
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRACK_URL,
  DEFAULT_VOLUME,
  MUSIC_LOOPS,
  clampVolume,
  musicControlState,
  readMusicPrefs,
  writeMusicPrefs
} from './music-panel.js';

test('background music loops and starts from the bundled original track', () => {
  assert.equal(MUSIC_LOOPS, true);
  assert.equal(DEFAULT_TRACK_URL, './playful-original.mp3');
});

test('play and pause labels stay distinct from the draw pause button', () => {
  const idle = musicControlState(false);
  const playing = musicControlState(true);
  assert.equal(idle.label, '▶ 音樂');
  assert.equal(idle.ariaLabel, '播放背景音樂');
  assert.equal(playing.label, '暫停音樂');
  assert.equal(playing.ariaLabel, '暫停背景音樂');
  for (const state of [idle, playing]) {
    assert.notEqual(state.label, '暫停');
    assert.notEqual(state.shortLabel, '暫停');
    assert.equal(state.shortLabel, '音樂');
  }
});

test('music is on until a returning user has paused it', () => {
  assert.deepEqual(readMusicPrefs(null), { on: true, volume: DEFAULT_VOLUME });
  assert.deepEqual(readMusicPrefs('not-json'), { on: true, volume: DEFAULT_VOLUME });
  assert.deepEqual(readMusicPrefs('{"on":false,"volume":0.32}'), { on: true, volume: DEFAULT_VOLUME });
  const playing = writeMusicPrefs({ on: true, volume: 1.8 });
  assert.deepEqual(readMusicPrefs(playing), { on: true, volume: 1 });
  const paused = writeMusicPrefs({ on: false, volume: 0.2 });
  assert.deepEqual(readMusicPrefs(paused), { on: false, volume: 0.2 });
  assert.equal(clampVolume('loud'), DEFAULT_VOLUME);
});

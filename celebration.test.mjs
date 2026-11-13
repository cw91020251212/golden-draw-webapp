import test from 'node:test';
import assert from 'node:assert/strict';
import { CELEBRATION_HEADING, celebrationPlan, synthesizeApplause } from './celebration.js';

test('full celebration is a multi-second gold sequence and the calm plan stays celebratory', () => {
  const full = celebrationPlan(false);
  assert.equal(full.heading, '恭喜你中頭獎');
  assert.equal(CELEBRATION_HEADING, full.heading);
  assert.ok(full.bursts.length >= 8);
  assert.ok(full.bursts.at(-1).t >= 6);
  assert.ok(full.applauseSeconds >= 6);
  assert.ok(full.balloonCount >= 6);
  assert.ok(full.confettiPerSecond >= 12);
  const calm = celebrationPlan(true);
  assert.equal(calm.heading, CELEBRATION_HEADING);
  assert.ok(calm.bursts.length >= 1);
  assert.ok(calm.applauseSeconds > 0 && calm.applauseSeconds < full.applauseSeconds);
  assert.ok(calm.balloonCount > 0);
  assert.ok(calm.confettiPerSecond > 0);
});

test('applause is synthesized stereo noise with a fade, not a silent buffer', () => {
  let seed = 7;
  const random = () => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const { left, right, peak } = synthesizeApplause(8000, 2, random);
  assert.equal(left.length, 16000);
  assert.equal(right.length, 16000);
  assert.ok(peak > 0.5);
  const energy = samples => samples.reduce((sum, n) => sum + n * n, 0);
  assert.ok(energy(left) > 0);
  assert.ok(energy(right) > 0);
  const edge = energy(left.subarray(0, 400));
  const middle = energy(left.subarray(6000, 6400));
  assert.ok(middle > edge);
});

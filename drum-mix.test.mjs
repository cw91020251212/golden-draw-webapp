import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL_RADIUS, MIX_OMEGA, drumMidY, stepDrumMix } from './drum-mix.js';

function pack() {
  const balls = [];
  let n = 1;
  for (let row = 0; row < 7 && n <= 49; row++) {
    for (let col = 0; col < 7 && n <= 49; col++) {
      balls.push({
        n: n++,
        x: (col - 3) * 0.28,
        y: -1.2 + row * 0.26,
        z: ((row + col) % 3 - 1) * 0.16,
        vx: 0, vy: 0, vz: 0, armed: false, rest: 0,
        maxY: -Infinity
      });
    }
  }
  return balls;
}

function runMix(seconds) {
  const balls = pack();
  const dt = 1 / 90;
  const samples = [];
  let elapsed = 0;
  for (let k = 0; k < seconds / dt; k++) {
    elapsed += dt;
    stepDrumMix(balls, dt, { elapsed, rotorZ: elapsed * MIX_OMEGA, depthLimit: 0.44 });
    for (const b of balls) b.maxY = Math.max(b.maxY, b.y);
    if (elapsed > 0.8 && k % 9 === 0) {
      let slow = 0, above = 0, below = 0, maxY = -Infinity;
      for (const b of balls) {
        const speed = Math.hypot(b.vx, b.vy, b.vz);
        if (speed < 0.45 && b.y < -0.65) slow++;
        if (b.y > drumMidY()) above++;
        else below++;
        if (b.y > maxY) maxY = b.y;
      }
      samples.push({ t: elapsed, slow, above, below, maxY });
    }
  }
  return { balls, samples };
}

test('paddles throw the pile past the drum midline and nobody sits on the floor', () => {
  const { balls, samples } = runMix(4.5);
  assert.equal(balls.length, 49);
  const peaks = balls.map(b => b.maxY).sort((a, b) => a - b);
  const mid = drumMidY();
  const cleared = peaks.filter(y => y > mid).length;
  const median = peaks[24];
  const quiet = samples.filter(s => s.t > 1.2);
  const worstSlow = Math.max(...quiet.map(s => s.slow));
  const typicalAbove = quiet.reduce((sum, s) => sum + s.above, 0) / quiet.length;
  const typicalBelow = quiet.reduce((sum, s) => sum + s.below, 0) / quiet.length;
  assert.ok(cleared >= 45, `only ${cleared} balls cleared the midline; lowest peak ${peaks[0].toFixed(2)}`);
  assert.ok(median > mid + 0.35, `median peak ${median.toFixed(2)} should travel well past ${mid}`);
  assert.ok(worstSlow <= 3, `${worstSlow} balls were sitting still on the floor`);
  assert.ok(typicalAbove >= 8, `only ${typicalAbove.toFixed(1)} balls were above the midline on a typical frame`);
  assert.ok(typicalBelow >= 8, `only ${typicalBelow.toFixed(1)} balls were in the lower half; the mix should fall back through the bowl`);
  for (const b of balls) {
    assert.ok(Math.abs(b.z) < 0.5 + BALL_RADIUS, 'ball left the drum depth');
    assert.ok(Number.isFinite(b.y));
  }
});

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
        vx: 0, vy: 0, vz: 0, armed: false, rest: 0, nextKick: 0,
        maxY: -Infinity, minY: Infinity
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
    for (const b of balls) {
      b.maxY = Math.max(b.maxY, b.y);
      if (elapsed > 1.3) b.minY = Math.min(b.minY, b.y);
    }
    if (elapsed > 1.5 && k % 18 === 0) {
      let bowl = 0, upper = 0, still = 0, maxY = -Infinity;
      for (const b of balls) {
        if (b.y < -0.7) bowl++;
        if (b.y > drumMidY()) upper++;
        if (Math.hypot(b.vx, b.vy, b.vz) < 0.22 && b.y < -1.0) still++;
        if (b.y > maxY) maxY = b.y;
      }
      samples.push({ t: elapsed, bowl, upper, still, maxY });
    }
  }
  return { balls, samples };
}

test('jumps clear the midline, then fall back into a moving lower pile', () => {
  const { balls, samples } = runMix(5.5);
  assert.equal(balls.length, 49);
  const mid = drumMidY();
  const peaks = balls.map(b => b.maxY);
  const cleared = peaks.filter(y => y > mid).length;
  const returned = balls.filter(b => b.minY < -0.85).length;
  const avg = key => samples.reduce((sum, s) => sum + s[key], 0) / samples.length;
  const avgBowl = avg('bowl');
  const avgUpper = avg('upper');
  const minBowl = Math.min(...samples.map(s => s.bowl));
  const maxStill = Math.max(...samples.map(s => s.still));
  assert.ok(cleared >= 36, `only ${cleared} balls ever cleared the midline`);
  assert.ok(returned >= 40, `only ${returned} balls fell back into the lower bowl`);
  assert.ok(avgBowl >= 12, `lower bowl averaged only ${avgBowl.toFixed(1)} balls`);
  assert.ok(minBowl >= 6, `lower bowl dropped to ${minBowl} balls`);
  assert.ok(avgUpper >= 4, `only ${avgUpper.toFixed(1)} balls were above the midline`);
  assert.ok(avgUpper <= 18, `upper half averaged ${avgUpper.toFixed(1)} balls; the floor should stay occupied`);
  assert.ok(maxStill <= 8, `${maxStill} balls were sitting still on the floor`);
  for (const b of balls) {
    assert.ok(Math.abs(b.z) < 0.5 + BALL_RADIUS, 'ball left the drum depth');
    assert.ok(Number.isFinite(b.y));
  }
});

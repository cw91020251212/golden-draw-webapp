import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDE_CAMERA_POS, WIDE_CAMERA_TARGET } from './wide-camera.js';
import {
  ORBIT_MIN_PHI,
  ORBIT_MAX_PHI,
  ORBIT_MIN_RADIUS,
  ORBIT_MAX_RADIUS,
  ORBIT_YAW_PER_PX,
  orbitFromOffset,
  offsetFromOrbit,
  orbitAround,
  clampOrbit,
  nudgeOrbit
} from './orbit-camera.js';

function offsetOf(position, target) {
  return [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
}

test('the official wide shot is one point on the orbit and is not clamped away', () => {
  const orbit = orbitFromOffset(offsetOf(WIDE_CAMERA_POS, WIDE_CAMERA_TARGET));
  assert.ok(orbit.radius > ORBIT_MIN_RADIUS && orbit.radius < ORBIT_MAX_RADIUS);
  assert.ok(orbit.phi > ORBIT_MIN_PHI && orbit.phi < ORBIT_MAX_PHI);
  const clamped = clampOrbit(orbit);
  const back = orbitAround(WIDE_CAMERA_TARGET, clamped);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(back[i] - WIDE_CAMERA_POS[i]) < 1e-9);
});

test('half a turn from the official angle looks at the back of the drum', () => {
  const orbit = orbitFromOffset(offsetOf(WIDE_CAMERA_POS, WIDE_CAMERA_TARGET));
  const pixels = Math.PI / ORBIT_YAW_PER_PX;
  const turned = nudgeOrbit(orbit, -pixels, 0, 1);
  const eye = orbitAround(WIDE_CAMERA_TARGET, turned);
  assert.ok(eye[2] < WIDE_CAMERA_TARGET[2], 'camera should stand on the back side of the target');
  assert.ok(eye[1] > WIDE_CAMERA_TARGET[1], 'the look-down elevation stays above the target');
});

test('pinch and pitch stay inside the limits', () => {
  const orbit = orbitFromOffset(offsetOf(WIDE_CAMERA_POS, WIDE_CAMERA_TARGET));
  const tight = nudgeOrbit(orbit, 0, -500, 0.2);
  assert.equal(tight.radius, ORBIT_MAX_RADIUS);
  assert.equal(tight.phi, ORBIT_MIN_PHI);
  const wide = nudgeOrbit(orbit, 0, 500, 4);
  assert.equal(wide.radius, ORBIT_MIN_RADIUS);
  assert.equal(wide.phi, ORBIT_MAX_PHI);
  const round = offsetFromOrbit(orbit);
  assert.ok(Math.abs(Math.hypot(...round) - orbit.radius) < 1e-9);
});

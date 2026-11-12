import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRollPlan, rollPosition, rollSteps } from './roll-physics.js';

const closeTo = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`);

function onlyStep(path, radius = 1, progress = 1) {
  const steps = rollSteps(buildRollPlan(path, radius), progress);
  assert.equal(steps.length, 1);
  return steps[0];
}

test('a ball rolling left on a flat lane rotates about +Z', () => {
  const step = onlyStep([[0, 0, 0], [-2, 0, 0]], 0.5);
  assert.deepEqual(step.axis, [0, 0, 1]);
  closeTo(step.angle, 4);
});

test('a ball rolling down the left ramp uses the ramp normal and still rolls left', () => {
  const step = onlyStep([[0, 1, 0], [-1, 0.5, 0]], 0.25);
  assert.ok(step.axis[2] > 0, 'leftward ramp should spin around +Z');
  closeTo(Math.hypot(...step.axis), 1);
  closeTo(step.angle, Math.hypot(1, 0.5) / 0.25);
});

test('the special ball rolling right down its ramp rotates about -Z', () => {
  const step = onlyStep([[0, 1, 0], [1, 0.5, 0]], 0.25);
  assert.ok(step.axis[2] < 0, 'rightward ramp should spin around -Z');
  closeTo(Math.hypot(...step.axis), 1);
});

test('a ball rolling forward along +Z rotates about +X, not Z', () => {
  const step = onlyStep([[0, 1, 0], [0, 1, 1]], 0.25);
  assert.deepEqual(step.axis, [1, 0, 0]);
  closeTo(step.angle, 4);
});

test('piecewise position and rolling angle use exactly the same travelled arc length', () => {
  const radius = 0.5;
  const plan = buildRollPlan([[0, 0, 0], [-1, 0, 0], [-2, -0.5, 0]], radius);
  const full = rollSteps(plan, 1);
  assert.equal(full.length, 2);
  assert.ok(full.every(step => step.axis[2] > 0));
  closeTo(full.reduce((sum, step) => sum + step.angle, 0), plan.totalDistance / radius);

  const progress = 0.5;
  const position = rollPosition(plan, progress);
  const actualTravel = 1 + Math.hypot(position[0] + 1, position[1]);
  const angleTravel = rollSteps(plan, progress).reduce((sum, step) => sum + step.angle * radius, 0);
  closeTo(actualTravel, plan.totalDistance * progress);
  closeTo(actualTravel, angleTravel);
  assert.deepEqual(rollPosition(plan, 0), plan.start);
  assert.deepEqual(rollPosition(plan, 1), plan.end);
});

test('zero displacement and a purely vertical free fall do not get a rolling spin', () => {
  assert.deepEqual(rollSteps(buildRollPlan([[1, 2, 3], [1, 2, 3]], 0.2), 1), []);
  assert.deepEqual(rollSteps(buildRollPlan([[0, 1, 0], [0, 0, 0]], 0.2), 1), []);
});

test('absolute progress can be recomputed after pause or timeline catch-up without extra spin', () => {
  const plan = buildRollPlan([[0, 0, 0], [0, 0, 1], [-1, -0.25, 1]], 0.2);
  const expected = rollSteps(plan, 0.8);
  rollSteps(plan, 0.2);
  rollSteps(plan, 0.6);
  assert.deepEqual(rollSteps(plan, 0.8), expected);
});

test('reversing a lane reverses its rotation axis without a global sign flip', () => {
  const left = onlyStep([[0, 0, 0], [-1, 0, 0]]);
  const right = onlyStep([[-1, 0, 0], [0, 0, 0]]);
  assert.equal(left.axis[2], -right.axis[2]);
  closeTo(left.angle, right.angle);
});

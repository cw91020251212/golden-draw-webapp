import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  adjustFov,
  adjustHeight,
  createRound,
  hudSpider,
  isLookingAt,
  landingDistance,
  marksAreDistinct,
  panAmount,
  pointOnBearing,
  positionBearing,
  signedDelta,
  updateRound
} from './logic.js';

const DEG = Math.PI / 180;

function input(over = {}) {
  return {
    viewYaw: 0,
    pitch: 0.4,
    slipper: null,
    stillFor: 0,
    accel: 0,
    yawRate: 0,
    stampPressed: false,
    swatPressed: false,
    lightPressed: false,
    pickupPressed: false,
    flickPressed: false,
    nestIgnoredFor: 0,
    ...over
  };
}

function stampOn(bug, extra = {}) {
  return input({
    slipper: { x: bug.x, z: bug.z },
    pitch: 70 * DEG,
    stillFor: 0.3,
    stampPressed: true,
    viewYaw: positionBearing(bug.x, bug.z),
    ...extra
  });
}

test('landing distance matches height over tan of pitch', () => {
  const at55 = landingDistance(1.2, 55 * DEG);
  const at75 = landingDistance(1.2, 75 * DEG);
  assert.ok(Math.abs(at55 - 1.2 / Math.tan(55 * DEG)) < 1e-9);
  assert.ok(at75 < 0.4);
  assert.equal(landingDistance(1.2, 0), Infinity);
});

test('height and field of view stay inside the playable range', () => {
  assert.equal(adjustHeight(1.2, true), 1.3);
  assert.equal(adjustHeight(1.6, true), 1.6);
  assert.equal(adjustHeight(0.9, false), 0.9);
  assert.equal(adjustFov(60, true), 64);
  assert.equal(adjustFov(40, false), 40);
});

test('a floor point keeps the bearing it was placed on', () => {
  for (const bearing of [0, 0.4, -1.2, 2.4]) {
    const point = pointOnBearing(bearing, 1.6);
    assert.ok(Math.abs(signedDelta(positionBearing(point.x, point.z), bearing)) < 1e-9);
  }
});

test('door and nest marks have to be turned apart', () => {
  assert.equal(marksAreDistinct(0, 0.1), false);
  assert.equal(marksAreDistinct(0, 0.5), true);
});

test('sound pans right when the target is clockwise', () => {
  assert.ok(panAmount(0, 0.8) > 0);
  assert.ok(panAmount(0, -0.8) < 0);
  assert.equal(panAmount(0, 0), 0);
});

test('the first stamp opens the pack and does not win', () => {
  const round = createRound(0.8, 2.2);
  const events = updateRound(round, 0.5, stampOn(round.roaches[0]));
  assert.equal(round.phase, 'pack');
  assert.equal(round.roaches.filter((roach) => roach.alive).length, 4);
  assert.ok(events.some((event) => event.type === 'spawn-pack'));
  assert.equal(round.outcome, null);
});

test('a phone jab cannot stamp until the slipper has been still', () => {
  const round = createRound(0.8, 2.2);
  const bug = round.roaches[0];
  const events = updateRound(round, 0.5, stampOn(bug, { stampPressed: false, accel: 20, stillFor: 0.05 }));
  assert.equal(bug.alive, true);
  assert.equal(events.some((event) => event.type === 'stamp'), false);
  const landed = updateRound(round, 0.5, stampOn(bug, { stampPressed: false, accel: 20, stillFor: 0.2 }));
  assert.equal(bug.alive, false);
  assert.ok(landed.some((event) => event.type === 'stamp'));
});

test('the spider comes out once the pack is almost gone, and stays put while watched', () => {
  const round = createRound(0.9, 2.4);
  updateRound(round, 0.5, stampOn(round.roaches[0]));
  let guard = 0;
  while (round.roaches.filter((roach) => roach.alive).length > 1 && guard < 10) {
    const bug = round.roaches.find((roach) => roach.alive);
    updateRound(round, 0.5, stampOn(bug));
    guard += 1;
  }
  assert.ok(round.spider);
  const watch = positionBearing(round.spider.x, round.spider.z);
  updateRound(round, 0.2, input({ viewYaw: watch, pitch: 0.8 }));
  assert.equal(hudSpider(round), '蜘蛛 停咗');
  const before = Math.hypot(round.spider.x, round.spider.z);
  updateRound(round, 1, input({ viewYaw: watch, pitch: 0.8 }));
  assert.ok(Math.abs(Math.hypot(round.spider.x, round.spider.z) - before) < 1e-6);
  assert.equal(round.spider.mode, 'wait');
});

test('the spider runs only when the view leaves it', () => {
  const round = createRound(0, 2);
  round.phase = 'spider';
  round.spider = {
    id: 9,
    kind: 'spider',
    x: 0,
    z: -1.9,
    hp: 2,
    alive: true,
    mode: 'wait'
  };
  updateRound(round, 1, input({ viewYaw: 2.5, pitch: 0.8 }));
  assert.equal(round.spider.mode, 'run');
  assert.ok(Math.hypot(round.spider.x, round.spider.z) < 1.9);
});

test('looking away from the nest sends the nearest roach onto the glass', () => {
  const round = createRound(0.5, 2);
  const roach = round.roaches[0];
  roach.x = 0.5;
  roach.z = -0.2;
  const events = updateRound(round, 0.8, input({ nestIgnoredFor: 2, viewYaw: 0, pitch: 0.2 }));
  assert.equal(roach.mode, 'glass');
  assert.equal(round.glass, 1);
  assert.ok(events.some((event) => event.type === 'glass'));
  assert.equal(round.outcome, null);
});

test('the second climb loses, and a flick puts the first climber back', () => {
  const round = createRound(0.5, 2);
  const roach = round.roaches[0];
  roach.mode = 'approach';
  roach.x = 0.2;
  roach.z = -0.1;
  updateRound(round, 0.2, input({ viewYaw: 0 }));
  assert.equal(round.climbingId, roach.id);
  updateRound(round, 0.2, input({ flickPressed: true }));
  assert.equal(round.climbingId, null);
  assert.ok(Math.hypot(roach.x, roach.z) > LIMITS.glassRadius);

  roach.mode = 'approach';
  roach.x = 0.2;
  roach.z = -0.1;
  const events = updateRound(round, 0.2, input({ viewYaw: 0 }));
  assert.equal(round.outcome, 'lose');
  assert.ok(events.some((event) => event.type === 'lose'));
});

test('light pushes roaches away and freezes a spider you are looking at', () => {
  const round = createRound(0, 2);
  const roach = round.roaches[0];
  const before = Math.hypot(roach.x - 0.2, roach.z + 0.2);
  round.phase = 'spider';
  round.spider = {
    id: 8,
    kind: 'spider',
    x: 0,
    z: -1.5,
    hp: 2,
    alive: true,
    mode: 'wait'
  };
  updateRound(round, 0.2, input({
    lightPressed: true,
    slipper: { x: 0.2, z: -0.2 },
    viewYaw: positionBearing(0, -1.5),
    pitch: 0.6
  }));
  assert.ok(Math.hypot(roach.x - 0.2, roach.z + 0.2) > before);
  assert.ok(round.spiderFrozenUntil > round.time - 0.01);
});

test('the newspaper is a wider hit and one swing kills the spider', () => {
  const round = createRound(0, 2);
  round.phase = 'spider';
  round.spider = {
    id: 4,
    kind: 'spider',
    x: 0.3,
    z: -1.2,
    hp: 2,
    alive: true,
    mode: 'wait'
  };
  round.held = true;
  // Face the spider so it does not run after the swing.
  const events = updateRound(round, 0.2, input({
    slipper: { x: 0.3, z: -1.2 },
    swatPressed: true,
    pitch: 0.8,
    viewYaw: positionBearing(0.3, -1.2)
  }));
  assert.equal(round.spider.alive, false);
  assert.ok(events.some((event) => event.type === 'swat'));
  assert.equal(isLookingAt(0, 0.01, 0, -1), false);
});

test('pickup only works when the slipper is on the paper', () => {
  const round = createRound(0, 2);
  updateRound(round, 0.1, input({
    pickupPressed: true,
    slipper: { x: round.paper.x + 1, z: round.paper.z }
  }));
  assert.equal(round.held, false);
  updateRound(round, 0.1, input({
    pickupPressed: true,
    slipper: { x: round.paper.x, z: round.paper.z }
  }));
  assert.equal(round.held, true);
});

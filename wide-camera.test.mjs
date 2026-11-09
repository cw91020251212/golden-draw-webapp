import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHOTO_NEAR_PILLAR_SIDE,
  WIDE_CAMERA_POS,
  WIDE_CAMERA_TARGET,
  nearerPostScreenSide,
  assertWideCameraHandedness
} from './wide-camera.js';

test('photo rule is the viewer-right nearer pillar', () => {
  assert.equal(PHOTO_NEAR_PILLAR_SIDE, 'right');
});

test('authored wide camera puts the nearer post on the photo side', () => {
  assert.equal(nearerPostScreenSide(WIDE_CAMERA_POS, WIDE_CAMERA_TARGET), PHOTO_NEAR_PILLAR_SIDE);
  assert.equal(assertWideCameraHandedness(), 'right');
});

test('mirrored camera X fails the photo rule', () => {
  const mirroredPos = [-WIDE_CAMERA_POS[0], WIDE_CAMERA_POS[1], WIDE_CAMERA_POS[2]];
  const mirroredTarget = [-WIDE_CAMERA_TARGET[0], WIDE_CAMERA_TARGET[1], WIDE_CAMERA_TARGET[2]];
  assert.equal(nearerPostScreenSide(mirroredPos, mirroredTarget), 'left');
  assert.throws(() => assertWideCameraHandedness(mirroredPos, mirroredTarget), /screen left/);
});

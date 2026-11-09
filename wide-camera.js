// PHOTO RULE, locked from user-desired-camera.jpg:
// the NEARER vertical gold pillar is on the viewer's RIGHT.
// The two posts stand at world x = ±1.62. With lookAt near the origin,
// positive camera.x puts the +1.62 post nearer and on screen right;
// negative camera.x puts the −1.62 post nearer and on screen left.
// A mirrored pose must fail assertWideCameraHandedness.
export const PHOTO_NEAR_PILLAR_SIDE = 'right';
export const POST_X = 1.62;
// Elevation: camera Y is above the look target, so the view looks down
// onto the top of the drum. X stays positive so the nearer post stays screen-right.
export const WIDE_CAMERA_POS = [3.6, 1.45, 7.5];
export const WIDE_CAMERA_TARGET = [-0.04, -0.55, 0.18];

function nearerPostScreenSide(position, target, postX = POST_X) {
  const eye = position;
  const z = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]];
  const zLen = Math.hypot(z[0], z[1], z[2]);
  z[0] /= zLen; z[1] /= zLen; z[2] /= zLen;
  // screen right = normalize(cross(worldUp, cameraBack))
  const x = [z[2], 0, -z[0]];
  const xLen = Math.hypot(x[0], x[1], x[2]) || 1;
  x[0] /= xLen; x[2] /= xLen;
  let nearer = null;
  for (const px of [-postX, postX]) {
    const rel = [px - eye[0], -1 - eye[1], 0.05 - eye[2]];
    const dist = Math.hypot(rel[0], rel[1], rel[2]);
    const ndcX = rel[0] * x[0] + rel[2] * x[2];
    if (!nearer || dist < nearer.dist) nearer = { dist, side: ndcX < 0 ? 'left' : 'right' };
  }
  return nearer.side;
}

function assertWideCameraHandedness(position = WIDE_CAMERA_POS, target = WIDE_CAMERA_TARGET) {
  const side = nearerPostScreenSide(position, target);
  if (side !== PHOTO_NEAR_PILLAR_SIDE) {
    throw new Error(`Nearer pillar is on screen ${side}; the photo requires ${PHOTO_NEAR_PILLAR_SIDE}.`);
  }
  return side;
}

export { nearerPostScreenSide, assertWideCameraHandedness };

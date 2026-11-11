// In-drum mixing. The rotor sweeps clockwise and the paddles fling the pile
// so balls keep changing places. Jump speeds are high enough to clear the
// drum's midline; a ball that sits still is kicked back into the mix.
export const DRUM_RADIUS = 1.385;
export const DRUM_CENTER_Y = 0.05;
export const DRUM_HUB_Y = 0.16;
export const DRUM_GRAVITY = 8.8;
export const MIX_OMEGA = -7.2;
export const MIX_SPEED_CAP = 8.6;
export const BALL_RADIUS = 0.13;

const PADDLE_WINDOW = 0.32;

export function drumMidY() {
  return DRUM_HUB_Y;
}

function hash(n, t) {
  return fract(Math.sin(n * 12.9898 + t * 2.17) * 43758.5453);
}
function fract(n) {
  return n - Math.floor(n);
}

function contain(b, radius, centerY, depthLimit) {
  const dx = b.x, dy = b.y - centerY, dz = b.z;
  const d = Math.hypot(dx, dy, dz);
  if (d > radius && d > 1e-8) {
    const nx = dx / d, ny = dy / d, nz = dz / d;
    b.x = nx * radius;
    b.y = centerY + ny * radius;
    b.z = nz * radius;
    const vn = b.vx * nx + b.vy * ny + b.vz * nz;
    if (vn > 0) {
      const bounce = 1.42;
      b.vx -= bounce * vn * nx;
      b.vy -= bounce * vn * ny;
      b.vz -= bounce * vn * nz;
      return vn;
    }
  }
  if (b.z > depthLimit) { b.z = depthLimit; if (b.vz > 0) b.vz *= -0.72; }
  else if (b.z < -depthLimit) { b.z = -depthLimit; if (b.vz < 0) b.vz *= -0.72; }
  return 0;
}

// balls: {n,x,y,z,vx,vy,vz,armed,rest}
export function stepDrumMix(balls, dt, { elapsed, rotorZ, depthLimit, onWall, onBall } = {}) {
  const hubY = DRUM_HUB_Y;
  const centerY = DRUM_CENTER_Y;
  const radius = DRUM_RADIUS;
  const floorY = centerY - radius;
  const dir = MIX_OMEGA < 0 ? 1 : -1;
  const limit = depthLimit ?? 0.44;

  for (const b of balls) {
    b.vy -= DRUM_GRAVITY * dt;
    const rx = b.x;
    const ry = b.y - hubY;
    const ang = Math.atan2(ry, rx);
    let rel = ang - rotorZ + Math.PI / 2;
    const sector = Math.PI / 3;
    rel -= Math.round(rel / sector) * sector;
    // Scoop only in the lower bowl. Balls in the air finish their arc and fall
    // back, instead of being relaunched the moment they cross the midline.
    const hit = Math.abs(rel) < PADDLE_WINDOW && b.y < -0.32;
    if (hit && !b.armed) {
      const depth = Math.max(0, Math.min(1, (hubY - b.y) / (hubY - floorY)));
      const vary = 0.78 + 0.44 * hash(b.n, elapsed);
      const tx = dir * ry, ty = -dir * rx;
      const tlen = Math.hypot(tx, ty) || 1;
      const shove = (3.4 + 2.6 * depth) * vary;
      b.vx += (tx / tlen) * shove;
      b.vy += (ty / tlen) * shove * 0.45;
      const lift = (5.45 + 2.15 * depth) * vary;
      if (b.vy < lift) b.vy = lift;
      b.vz += (hash(b.n + 3, elapsed) - 0.5) * 3.4;
    }
    b.armed = !!hit;

    const drive = 12 * Math.max(0, (-0.05 - b.y) / 1.25);
    const tx = dir * ry, ty = -dir * rx;
    const tlen = Math.hypot(tx, ty) || 1;
    b.vx += (tx / tlen) * drive * dt;
    b.vy += (ty / tlen) * drive * dt;
    b.vz += Math.sin(elapsed * 2.4 + b.n * 1.31) * 2.4 * dt;

    const speed = Math.hypot(b.vx, b.vy, b.vz);
    if (speed < 0.55 && b.y < -0.65) b.rest = (b.rest || 0) + dt;
    else b.rest = 0;
    if ((b.rest || 0) > 0.16) {
      const depth = Math.max(0, Math.min(1, (hubY - b.y) / (hubY - floorY)));
      const vary = 0.88 + 0.28 * hash(b.n, elapsed + 1.7);
      b.vy = Math.max(b.vy, (5.6 + 1.8 * depth) * vary);
      b.vx += Math.sin(b.n * 1.7 + elapsed) * 2.2;
      b.vz += Math.cos(b.n * 0.9) * 1.5;
      b.rest = 0;
    }

    const sp = Math.hypot(b.vx, b.vy, b.vz);
    if (sp > MIX_SPEED_CAP) {
      const s = MIX_SPEED_CAP / sp;
      b.vx *= s; b.vy *= s; b.vz *= s;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    const wall = contain(b, radius, centerY, limit);
    if (wall > 0.2 && onWall) onWall(wall);

    const damp = Math.pow(0.9984, dt * 60);
    b.vx *= damp; b.vy *= damp; b.vz *= damp;
  }

  const minD = BALL_RADIUS * 2;
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < minD && dist > 1e-5) {
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const overlap = (minD - dist) * 0.5;
        a.x += nx * overlap; a.y += ny * overlap; a.z += nz * overlap;
        b.x -= nx * overlap; b.y -= ny * overlap; b.z -= nz * overlap;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
        if (rel < 0) {
          const k = 0.92;
          a.vx -= rel * k * nx; a.vy -= rel * k * ny; a.vz -= rel * k * nz;
          b.vx += rel * k * nx; b.vy += rel * k * ny; b.vz += rel * k * nz;
          if (onBall) onBall(-rel);
        }
      }
    }
  }
  for (const b of balls) contain(b, radius, centerY, limit);
}

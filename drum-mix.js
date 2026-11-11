// In-drum mixing. The rotor sweeps clockwise and the paddles fling the pile
// so balls keep changing places. Jump speeds are high enough to clear the
// drum's midline; a ball that sits still is kicked back into the mix.
export const DRUM_RADIUS = 1.385;
export const DRUM_CENTER_Y = 0.05;
export const DRUM_HUB_Y = 0.16;
export const DRUM_GRAVITY = 12;
export const MIX_OMEGA = -7.2;
export const MIX_SPEED_CAP = 8.6;
export const BALL_RADIUS = 0.13;

const PADDLE_WINDOW = 0.22;
const SCOOP_Y = -0.7;
const WALL_RESTITUTION = 0.82;
const MIN_WALL_REBOUND = 0.72;
const WALL_TANGENTIAL_FRICTION = 0.08;
const BALL_COLLISION_IMPULSE = 0.82;

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
    let vn = b.vx * nx + b.vy * ny + b.vz * nz;
    const outward = Math.max(0, vn);
    if (vn > 0) {
      const rebound = -Math.max(vn * WALL_RESTITUTION, MIN_WALL_REBOUND);
      const impulse = rebound - vn;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
      b.vz += impulse * nz;
      vn = rebound;
    }
    // Glass contact should knock the ball back into the drum, not let it
    // skate around the rim and leave the floor empty.
    const tx = b.vx - vn * nx, ty = b.vy - vn * ny, tz = b.vz - vn * nz;
    b.vx -= tx * WALL_TANGENTIAL_FRICTION;
    b.vy -= ty * WALL_TANGENTIAL_FRICTION;
    b.vz -= tz * WALL_TANGENTIAL_FRICTION;
    return outward;
  }
  if (b.z > depthLimit) { b.z = depthLimit; if (b.vz > 0) b.vz *= -0.72; }
  else if (b.z < -depthLimit) { b.z = -depthLimit; if (b.vz < 0) b.vz *= -0.72; }
  return 0;
}

// The live app rebuilds a plain body every frame. nextKick has to travel
// with that body, or the paddle cooldown is zero and the whole pile is scooped.
export function readDrumBody(ball) {
  return {
    n: ball.n,
    x: ball.x, y: ball.y, z: ball.z,
    vx: ball.vx, vy: ball.vy, vz: ball.vz,
    armed: !!ball.armed,
    rest: ball.rest || 0,
    nextKick: ball.nextKick || 0
  };
}

export function writeDrumBody(ball, body) {
  ball.x = body.x;
  ball.y = body.y;
  ball.z = body.z;
  ball.vx = body.vx;
  ball.vy = body.vy;
  ball.vz = body.vz;
  ball.armed = !!body.armed;
  ball.rest = body.rest || 0;
  ball.nextKick = body.nextKick || 0;
}

export function stepRebuiltDrumMix(balls, dt, ctx) {
  const bodies = balls.map(readDrumBody);
  stepDrumMix(bodies, dt, ctx);
  balls.forEach((ball, i) => writeDrumBody(ball, bodies[i]));
}

// balls: {n,x,y,z,vx,vy,vz,armed,rest,nextKick}
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
    // A paddle only scoops balls that have fallen back into the bottom pile,
    // and not on every pass. Airborne balls finish the arc, hit the glass,
    // or drop somewhere else in the bowl.
    const hit = Math.abs(rel) < PADDLE_WINDOW && b.y < SCOOP_Y && elapsed >= (b.nextKick || 0);
    if (hit) {
      const depth = Math.max(0, Math.min(1, (SCOOP_Y - b.y) / (SCOOP_Y - floorY)));
      const vary = 0.62 + 0.7 * hash(b.n, elapsed);
      const tx = dir * ry;
      const tlen = Math.hypot(tx, b.x) || 1;
      const lift = (6.3 + 1.8 * vary) * (0.94 + 0.06 * depth);
      if (b.vy < lift) b.vy = lift;
      b.vx += (hash(b.n + 1, elapsed) - 0.5) * 2.8 + (tx / tlen) * 0.4;
      b.vz += (hash(b.n + 3, elapsed) - 0.5) * 2.4;
      b.nextKick = elapsed + 0.95 + 0.55 * hash(b.n + 9, elapsed);
    }
    b.armed = !!hit;

    if (b.y < SCOOP_Y) {
      b.vz += Math.sin(elapsed * 2.2 + b.n * 1.31) * 0.8 * dt;
    }

    const speed = Math.hypot(b.vx, b.vy, b.vz);
    if (speed < 0.32 && b.y < -1.0) b.rest = (b.rest || 0) + dt;
    else b.rest = 0;
    if ((b.rest || 0) > 0.28) {
      const vary = hash(b.n, elapsed + 1.7);
      b.vy = Math.max(b.vy, 1.4 + vary * 1.3);
      b.vx += Math.sin(b.n * 1.7 + elapsed) * 1.5;
      b.vz += Math.cos(b.n * 0.9) * 1.1;
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

    const damp = Math.pow(0.9965, dt * 60);
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
          a.vx -= rel * BALL_COLLISION_IMPULSE * nx;
          a.vy -= rel * BALL_COLLISION_IMPULSE * ny;
          a.vz -= rel * BALL_COLLISION_IMPULSE * nz;
          b.vx += rel * BALL_COLLISION_IMPULSE * nx;
          b.vy += rel * BALL_COLLISION_IMPULSE * ny;
          b.vz += rel * BALL_COLLISION_IMPULSE * nz;
          if (onBall) onBall(-rel);
        }
      }
    }
  }
  for (const b of balls) contain(b, radius, centerY, limit);
}

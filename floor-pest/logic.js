// Rules for one standing round. Positions sit on the floor plane:
// bearing 0 looks down -Z, and positionBearing(x, z) uses the same zero.

const DEG = Math.PI / 180;

export const LIMITS = {
  // Any view that already puts the slipper on the floor can stamp. A steeper
  // 55° gate left bugs at 1.6 m unreachable, because that pitch keeps the
  // slipper inside about 0.8 m.
  stampPitch: 18 * DEG,
  stampAccel: 12,
  stillTime: 0.12,
  stampRadius: 0.12,
  swatRadius: 0.2,
  swatYawRate: 140,
  glassRadius: 0.28,
  lookAngle: 25 * DEG,
  lookPitch: 15 * DEG,
  spiderCourage: 70 * DEG,
  nestIgnoreAngle: 40 * DEG,
  nestIgnoreTime: 2,
  lightCooldown: 1.2,
  spiderFreeze: 0.5,
  attackGap: 0.35,
  distinctMarks: 20 * DEG,
  heightMin: 0.9,
  heightMax: 1.6,
  fovMin: 40,
  fovMax: 80,
  arena: 2.6
};

export function signedDelta(from, to) {
  const full = Math.PI * 2;
  let d = to - from;
  d = ((d + Math.PI) % full + full) % full - Math.PI;
  return d;
}

export function landingDistance(heightM, pitchRad) {
  if (!(pitchRad > 0.08)) return Infinity;
  return heightM / Math.tan(pitchRad);
}

export function adjustHeight(heightM, closer) {
  const next = heightM + (closer ? 0.1 : -0.1);
  return Math.min(LIMITS.heightMax, Math.max(LIMITS.heightMin, Math.round(next * 100) / 100));
}

export function adjustFov(fov, wider) {
  const next = fov + (wider ? 4 : -4);
  return Math.min(LIMITS.fovMax, Math.max(LIMITS.fovMin, next));
}

export function pointOnBearing(bearing, distance) {
  return {
    x: Math.sin(bearing) * distance,
    z: -Math.cos(bearing) * distance
  };
}

export function positionBearing(x, z) {
  return Math.atan2(x, -z);
}

export function marksAreDistinct(a, b) {
  return Math.abs(signedDelta(a, b)) >= LIMITS.distinctMarks;
}

export function panAmount(viewYaw, targetYaw) {
  return Math.max(-1, Math.min(1, signedDelta(viewYaw, targetYaw) / (Math.PI / 2)));
}

export function isLookingAt(viewYaw, viewPitch, x, z) {
  if (viewPitch < LIMITS.lookPitch) return false;
  return Math.abs(signedDelta(viewYaw, positionBearing(x, z))) <= LIMITS.lookAngle;
}

function moveToward(bug, x, z, speed, dt) {
  const dx = x - bug.x;
  const dz = z - bug.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-5) return;
  const step = Math.min(dist, speed * dt);
  bug.x += (dx / dist) * step;
  bug.z += (dz / dist) * step;
}

function clampArena(bug) {
  const dist = Math.hypot(bug.x, bug.z);
  if (dist > LIMITS.arena) {
    bug.x *= LIMITS.arena / dist;
    bug.z *= LIMITS.arena / dist;
  }
}

function makeRoach(nest, id, orbit) {
  return {
    id,
    kind: 'roach',
    x: nest.x + Math.cos(orbit) * 0.2,
    z: nest.z + Math.sin(orbit) * 0.2,
    hp: 1,
    alive: true,
    mode: 'mill',
    orbit,
    orbitR: 0.18 + (id % 3) * 0.07
  };
}

function makeSpider(point, id) {
  return {
    id,
    kind: 'spider',
    x: point.x,
    z: point.z,
    hp: 2,
    alive: true,
    mode: 'wait'
  };
}

export function createRound(doorYaw, nestYaw) {
  const nest = pointOnBearing(nestYaw, 1.6);
  return {
    doorYaw,
    nestYaw,
    nest,
    paper: pointOnBearing(doorYaw, 1.1),
    phase: 'first',
    roaches: [makeRoach(nest, 1, 0)],
    spider: null,
    nextId: 2,
    glass: 0,
    held: false,
    climbingId: null,
    outcome: null,
    lightReadyAt: 0,
    attackReadyAt: 0,
    spiderFrozenUntil: 0,
    time: 0,
    spiderSince: null
  };
}

function livingRoaches(round) {
  return round.roaches.filter((roach) => roach.alive);
}

function bugById(round, id) {
  if (round.spider && round.spider.id === id) return round.spider;
  return round.roaches.find((roach) => roach.id === id) || null;
}

function floorBugs(round) {
  const list = round.roaches.filter((roach) => roach.alive && roach.mode !== 'glass');
  if (round.spider && round.spider.alive && round.spider.mode !== 'glass') list.push(round.spider);
  return list;
}

function nearestBug(round, point, radius) {
  let best = null;
  let bestD = Infinity;
  for (const bug of floorBugs(round)) {
    const reach = radius + (bug.kind === 'spider' ? 0.06 : 0.04);
    const dist = Math.hypot(bug.x - point.x, bug.z - point.z);
    if (dist <= reach && dist < bestD) {
      best = bug;
      bestD = dist;
    }
  }
  return best;
}

function afterDeath(round, events) {
  const roachesLeft = livingRoaches(round).length;
  if (round.phase === 'first') {
    round.phase = 'pack';
    for (let i = 0; i < 4; i += 1) {
      round.roaches.push(makeRoach(round.nest, round.nextId, i * 1.4 + 0.4));
      round.nextId += 1;
    }
    events.push({ type: 'spawn-pack' });
    return;
  }
  if (round.phase === 'pack' && roachesLeft <= 1 && !round.spider) {
    round.phase = 'spider';
    round.spider = makeSpider(pointOnBearing(round.doorYaw, 1.9), round.nextId);
    round.nextId += 1;
    round.spiderSince = round.time;
    events.push({ type: 'spawn-spider' });
  }
  const spiderDead = round.spider && !round.spider.alive;
  if (round.spider && spiderDead && roachesLeft === 0) {
    round.outcome = 'win';
    round.phase = 'done';
    events.push({ type: 'win' });
  }
}

function damageBug(round, bug, amount, events) {
  bug.hp -= amount;
  if (bug.hp > 0) {
    events.push({ type: 'hurt', id: bug.id, kind: bug.kind });
    return;
  }
  bug.alive = false;
  bug.mode = 'dead';
  events.push({ type: 'dead', id: bug.id, kind: bug.kind });
  afterDeath(round, events);
}

function beginGlass(round, bug, events) {
  bug.mode = 'glass';
  round.climbingId = bug.id;
  round.glass += 1;
  events.push({ type: 'glass', id: bug.id, kind: bug.kind, count: round.glass });
  if (round.glass >= 2) {
    round.outcome = 'lose';
    events.push({ type: 'lose' });
  }
}

function updateRoaches(round, dt, ignoredFor, events) {
  const approaching = round.roaches.some((roach) => roach.alive && roach.mode === 'approach');
  if (!approaching && ignoredFor >= LIMITS.nestIgnoreTime) {
    let nearest = null;
    let best = Infinity;
    for (const roach of round.roaches) {
      if (!roach.alive || roach.mode !== 'mill') continue;
      const dist = Math.hypot(roach.x, roach.z);
      if (dist < best) {
        best = dist;
        nearest = roach;
      }
    }
    if (nearest) nearest.mode = 'approach';
  }
  for (const roach of round.roaches) {
    if (!roach.alive || roach.mode === 'glass') continue;
    if (roach.mode === 'mill') {
      roach.orbit += dt * 1.7;
      moveToward(
        roach,
        round.nest.x + Math.cos(roach.orbit) * roach.orbitR,
        round.nest.z + Math.sin(roach.orbit) * roach.orbitR,
        0.55,
        dt
      );
    } else if (roach.mode === 'approach') {
      moveToward(roach, 0, 0, 0.42, dt);
      if (Math.hypot(roach.x, roach.z) <= LIMITS.glassRadius) {
        beginGlass(round, roach, events);
        return;
      }
    }
    clampArena(roach);
  }
}

function updateSpider(round, dt, viewYaw, events) {
  const spider = round.spider;
  if (!spider || !spider.alive || spider.mode === 'glass') return;
  if (round.time < round.spiderFrozenUntil) {
    spider.mode = 'wait';
    return;
  }
  const off = Math.abs(signedDelta(viewYaw, positionBearing(spider.x, spider.z)));
  if (off > LIMITS.spiderCourage) {
    spider.mode = 'run';
    moveToward(spider, 0, 0, 0.45, dt);
    if (Math.hypot(spider.x, spider.z) <= LIMITS.glassRadius) {
      beginGlass(round, spider, events);
      return;
    }
  } else {
    spider.mode = 'wait';
  }
  clampArena(spider);
}

export function updateRound(round, dt, input) {
  const events = [];
  if (round.outcome) return events;
  round.time += dt;

  if (round.climbingId) {
    if (input.flickPressed && round.outcome == null) {
      const bug = bugById(round, round.climbingId);
      round.climbingId = null;
      if (bug && bug.alive) {
        const back = pointOnBearing(positionBearing(bug.x, bug.z), 0.95);
        bug.x = back.x;
        bug.z = back.z;
        bug.mode = bug.kind === 'roach' ? 'mill' : 'wait';
      }
      events.push({ type: 'flick' });
    }
    return events;
  }

  if (input.pickupPressed && round.paper) {
    if (round.held) {
      round.held = false;
      events.push({ type: 'drop' });
    } else if (input.slipper) {
      const dist = Math.hypot(round.paper.x - input.slipper.x, round.paper.z - input.slipper.z);
      if (dist < 0.22) {
        round.held = true;
        events.push({ type: 'pickup' });
      }
    }
  }

  if (input.lightPressed && round.time >= round.lightReadyAt) {
    round.lightReadyAt = round.time + LIMITS.lightCooldown;
    const from = input.slipper || { x: 0, z: 0 };
    for (const roach of round.roaches) {
      if (!roach.alive || roach.mode === 'glass') continue;
      const dx = roach.x - from.x;
      const dz = roach.z - from.z;
      const len = Math.hypot(dx, dz) || 1;
      roach.x += (dx / len) * 0.4;
      roach.z += (dz / len) * 0.4;
      if (roach.mode === 'approach') roach.mode = 'mill';
      clampArena(roach);
    }
    if (
      round.spider &&
      round.spider.alive &&
      isLookingAt(input.viewYaw, input.pitch, round.spider.x, round.spider.z)
    ) {
      round.spiderFrozenUntil = round.time + LIMITS.spiderFreeze;
    }
    events.push({ type: 'light' });
  }

  const canHit = input.slipper && round.time >= round.attackReadyAt;
  const swat = canHit && round.held && (input.swatPressed || input.yawRate >= LIMITS.swatYawRate) && input.pitch > LIMITS.lookPitch;
  // The on-screen button is a deliberate stamp. A phone jab still has to
  // come after the slipper has been held still, so a turn does not kill.
  const jab = input.accel >= LIMITS.stampAccel && input.stillFor >= LIMITS.stillTime;
  const stamp = canHit && input.pitch >= LIMITS.stampPitch && (input.stampPressed || jab);

  if (swat) {
    const target = nearestBug(round, input.slipper, LIMITS.swatRadius);
    if (target) {
      round.attackReadyAt = round.time + LIMITS.attackGap;
      damageBug(round, target, 2, events);
      events.push({ type: 'swat', id: target.id });
    }
  } else if (stamp) {
    const target = nearestBug(round, input.slipper, LIMITS.stampRadius);
    if (target) {
      round.attackReadyAt = round.time + LIMITS.attackGap;
      damageBug(round, target, 1, events);
      events.push({ type: 'stamp', id: target.id });
    }
  }

  if (round.outcome || round.climbingId) return events;

  updateRoaches(round, dt, input.nestIgnoredFor || 0, events);
  if (round.outcome || round.climbingId) return events;
  updateSpider(round, dt, input.viewYaw, events);
  return events;
}

export function hudSpider(round) {
  if (!round.spider) return '蜘蛛 未出';
  if (!round.spider.alive) return '蜘蛛 清咗';
  if (round.spider.mode === 'run') return '蜘蛛 跑緊';
  if (round.spider.mode === 'glass') return '蜘蛛 上玻璃';
  return '蜘蛛 停咗';
}

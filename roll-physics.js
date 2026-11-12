const EPSILON = 1e-9;

const point3 = point => Array.isArray(point) ? [...point] : point.toArray();
const normalize = ([x, y, z]) => {
  const length = Math.hypot(x, y, z);
  if (length <= EPSILON) return [0, 0, 0];
  return [x / length, y / length, z / length].map(value => value === 0 ? 0 : value);
};
const clamp01 = value => Math.max(0, Math.min(1, value));

/**
 * Build a piecewise rolling plan for a sampled path on a Y-up receiver.
 * The receiver is flat in Z; its profile normal comes from dy/dx. For a
 * cross-lane (+/-Z) segment, the surface normal remains straight up.
 */
export function buildRollPlan(path, radius) {
  if (!Array.isArray(path) || path.length < 2) throw new TypeError('A roll path needs at least two points');
  if (!(radius > 0)) throw new RangeError('Ball radius must be positive');

  const points = path.map(point3);
  const segments = [];
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const delta = to.map((value, component) => value - from[component]);
    const distance = Math.hypot(...delta);
    if (distance <= EPSILON) continue;

    const tangent = delta.map(component => component / distance);
    const slope = Math.abs(delta[0]) > EPSILON ? delta[1] / delta[0] : 0;
    const normal = normalize([-slope, 1, 0]);
    const axis = normalize([
      normal[1] * tangent[2] - normal[2] * tangent[1],
      normal[2] * tangent[0] - normal[0] * tangent[2],
      normal[0] * tangent[1] - normal[1] * tangent[0]
    ]);

    segments.push({ startDistance: totalDistance, distance, axis, from, to });
    totalDistance += distance;
  }

  return { radius, totalDistance, segments, start: points[0], end: points[points.length - 1] };
}

/** Return the ball centre at the travelled fraction of the path's arc length. */
export function rollPosition(plan, progress = 1) {
  if (!plan?.segments?.length) return [...(plan?.end || [0, 0, 0])];
  const distanceToTravel = plan.totalDistance * clamp01(progress);
  for (const segment of plan.segments) {
    if (distanceToTravel <= segment.startDistance + segment.distance) {
      const part = clamp01((distanceToTravel - segment.startDistance) / segment.distance);
      return segment.from.map((value, component) => value + (segment.to[component] - value) * part);
    }
  }
  return [...plan.end];
}

/** Return ordered world-axis rotations for the same travelled arc length. */
export function rollSteps(plan, progress = 1) {
  if (!plan || !(plan.radius > 0) || !(plan.totalDistance > 0)) return [];
  const distanceToTravel = plan.totalDistance * clamp01(progress);
  if (distanceToTravel <= EPSILON) return [];

  const steps = [];
  for (const segment of plan.segments) {
    const travelled = Math.max(0, Math.min(segment.distance, distanceToTravel - segment.startDistance));
    if (travelled > EPSILON && Math.hypot(...segment.axis) > EPSILON) {
      steps.push({ axis: segment.axis, angle: travelled / plan.radius });
    }
    if (distanceToTravel <= segment.startDistance + segment.distance) break;
  }
  return steps;
}

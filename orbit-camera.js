// Free look around the locked wide-shot target.
// The official pose is one point on this sphere. Reset is that point again.
// Theta turns around the machine (the back is half a turn from the default).
// Phi is the elevation. Radius is the pinch / wheel zoom.

export const ORBIT_MIN_RADIUS = 5.4;
export const ORBIT_MAX_RADIUS = 16.5;
export const ORBIT_MIN_PHI = 0.28;
export const ORBIT_MAX_PHI = 1.42;
export const ORBIT_YAW_PER_PX = 0.0055;
export const ORBIT_PITCH_PER_PX = 0.0045;
// Same dead-zone as the wooden-tower reference: a short press stays a tap.
export const DRAG_THRESHOLD_PX = 7;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function orbitFromOffset(offset) {
  const radius = Math.hypot(offset[0], offset[1], offset[2]) || 1;
  return {
    radius,
    theta: Math.atan2(offset[0], offset[2]),
    phi: Math.acos(clamp(offset[1] / radius, -1, 1))
  };
}

export function offsetFromOrbit(orbit) {
  const sinPhi = Math.sin(orbit.phi);
  return [
    orbit.radius * sinPhi * Math.sin(orbit.theta),
    orbit.radius * Math.cos(orbit.phi),
    orbit.radius * sinPhi * Math.cos(orbit.theta)
  ];
}

export function orbitAround(pivot, orbit) {
  const offset = offsetFromOrbit(orbit);
  return [pivot[0] + offset[0], pivot[1] + offset[1], pivot[2] + offset[2]];
}

export function clampOrbit(orbit) {
  return {
    radius: clamp(orbit.radius, ORBIT_MIN_RADIUS, ORBIT_MAX_RADIUS),
    theta: orbit.theta,
    phi: clamp(orbit.phi, ORBIT_MIN_PHI, ORBIT_MAX_PHI)
  };
}

// Drag right turns the view to the right. Drag up raises the camera.
// Pinch scale is current finger distance / distance at the start of the pinch.
export function nudgeOrbit(orbit, dx, dy, pinchScale = 1) {
  return clampOrbit({
    radius: orbit.radius / (pinchScale || 1),
    theta: orbit.theta - dx * ORBIT_YAW_PER_PX,
    phi: orbit.phi + dy * ORBIT_PITCH_PER_PX
  });
}

export function startPointer(x, y) {
  return { x, y, startX: x, startY: y, moved: false, dx: 0, dy: 0 };
}

// One finger or the mouse. Past the threshold the same step rotates the view.
export function stepPointer(state, x, y) {
  const dx = x - state.x;
  const dy = y - state.y;
  const moved = state.moved || Math.hypot(x - state.startX, y - state.startY) >= DRAG_THRESHOLD_PX;
  return { x, y, startX: state.startX, startY: state.startY, moved, dx: moved ? dx : 0, dy: moved ? dy : 0 };
}

export function releaseIsTap(state) {
  return !state?.moved;
}

// Two-finger pinch. Scale is the new finger distance divided by the previous one.
export function pinchScale(previousDistance, nextDistance) {
  if (!previousDistance || !nextDistance) return 1;
  return nextDistance / previousDistance;
}

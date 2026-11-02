import * as THREE_DEFAULT from './three.module.js';

// Rebuilt against the front elevation, the tray shape study, the HKJC photos
// and the draw footage. One receiving tray: a long lower run on the left, a
// floor that rises to the right, and a short higher pocket with a notched
// entry under the chute. Balls 1–6 roll left; the 7th stays in the pocket.

const BALL_R = 0.095;
const BALL_D = BALL_R * 2;

function addBox(parent, name, width, height, depth, material, x, y, z) {
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addCylinderZ(parent, name, radius, depth, material, x, y, z, segments = 48) {
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.CylinderGeometry(radius, radius, depth, segments), material);
  mesh.name = name;
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addBeam(parent, name, a, b, radius, material, segments = 12) {
  const start = new THREE_DEFAULT.Vector3(...a);
  const end = new THREE_DEFAULT.Vector3(...b);
  const direction = new THREE_DEFAULT.Vector3().subVectors(end, start);
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.CylinderGeometry(radius, radius, direction.length(), segments), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE_DEFAULT.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addFlatBar(parent, name, a, b, width, thickness, material) {
  const start = new THREE_DEFAULT.Vector3(...a);
  const end = new THREE_DEFAULT.Vector3(...b);
  const direction = new THREE_DEFAULT.Vector3().subVectors(end, start);
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.BoxGeometry(width, direction.length(), thickness), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE_DEFAULT.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addRing(parent, name, radius, tube, z, material, segments = 96) {
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.TorusGeometry(radius, tube, 16, segments), material);
  mesh.name = name;
  mesh.position.set(0, 0, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addSegment(parent, name, x0, y0, x1, y1, z, depth, thickness, material) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) + thickness * 0.35;
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.BoxGeometry(len, thickness, depth), material);
  mesh.name = name;
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2 - (thickness / 2) * Math.cos(Math.atan2(dy, dx)), z);
  mesh.rotation.z = Math.atan2(dy, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function nameplateTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 280;
  const g = c.getContext('2d');
  g.fillStyle = '#e6c36a';
  g.fillRect(0, 0, 1024, 280);
  g.strokeStyle = '#8d6424';
  g.lineWidth = 10;
  g.strokeRect(16, 16, 992, 248);
  // Simplified four-loop mark, the shape printed on the real cabinet.
  const mark = (cx, cy, r, color) => {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
  };
  mark(168, 118, 46, '#1f4f86');
  mark(214, 118, 46, '#1f4f86');
  mark(168, 164, 46, '#1f4f86');
  mark(214, 164, 46, '#1f4f86');
  mark(191, 141, 16, '#e6c36a');
  g.fillStyle = '#3a2a12';
  g.font = '700 64px "Noto Sans CJK TC","WenQuanYi Micro Hei","Droid Sans Fallback",sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('香港馬會獎券有限公司', 280, 118);
  g.font = '600 40px Arial,sans-serif';
  g.fillStyle = '#5a4318';
  g.fillText('HKJC Lotteries Limited', 284, 186);
  const t = new THREE_DEFAULT.CanvasTexture(c);
  t.colorSpace = THREE_DEFAULT.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const RACK_COUNTS = [10, 10, 10, 10, 9];
const RACK_GAP_X = 0.252;
const RACK_GAP_Y = 0.208;
const RACK_TOP_BALL_Y = 3.92;
const RACK_Z = 0.06;

export function rackPosition(index) {
  let n = index, col = 0;
  while (col < RACK_COUNTS.length && n >= RACK_COUNTS[col]) { n -= RACK_COUNTS[col]; col++; }
  const row = n;
  const x = (col - 2) * RACK_GAP_X;
  const y = RACK_TOP_BALL_Y - (RACK_COUNTS[col] - 1 - row) * RACK_GAP_Y;
  return new THREE_DEFAULT.Vector3(x, y, RACK_Z);
}

export function buildMachine(_THREE, root, materials) {
  const T = _THREE || THREE_DEFAULT;
  const { gold, darkGold, brightGold, glass, edgeGlass } = materials;
  const frame = new T.Group();
  frame.name = 'mark-six-machine';
  root.add(frame);

  const drumY = 0.16;
  const drumRadius = 1.50;
  const drumDepth = 1.06;

  // Gold cabinet, round feet, and the lotteries nameplate from the machine photos.
  addBox(frame, 'lower-cabinet', 2.85, 0.64, 1.36, darkGold, 0.02, -2.40, 0.30);
  addBox(frame, 'cabinet-top', 2.72, 0.05, 1.24, gold, 0.02, -2.06, 0.34);
  addBox(frame, 'cabinet-front-lip', 2.76, 0.07, 0.05, brightGold, 0.02, -2.10, 0.96);
  const plate = new T.Mesh(new T.BoxGeometry(1.72, 0.42, 0.02), new T.MeshStandardMaterial({
    map: nameplateTexture(), metalness: 0.35, roughness: 0.45, color: 0xfff1c4
  }));
  plate.name = 'hkjc-nameplate';
  plate.position.set(0.02, -2.46, 0.99);
  frame.add(plate);
  for (const [x, z] of [[-1.12, 0.62], [1.16, 0.62], [-1.12, -0.15], [1.16, -0.15]]) {
    addBox(frame, 'foot-stem', 0.09, 0.16, 0.09, darkGold, x, -2.80, z);
    const foot = new T.Mesh(new T.CylinderGeometry(0.13, 0.15, 0.07, 28), gold);
    foot.name = 'round-foot';
    foot.position.set(x, -2.90, z);
    frame.add(foot);
  }

  // Side standards holding the drum ring.
  for (const x of [-1.62, 1.62]) {
    addBeam(frame, 'side-standard', [x, -2.02, 0.05], [x, 0.95, 0.05], 0.055, darkGold);
    addBeam(frame, 'side-standard-front', [x * 0.98, -2.02, 0.55], [x * 0.92, -0.20, 0.55], 0.04, gold);
  }
  addBeam(frame, 'rear-crossbar', [-1.55, 0.95, -0.28], [1.55, 0.95, -0.28], 0.045, darkGold);
  addCylinderZ(frame, 'axle-cap-left', 0.09, 0.08, brightGold, -1.58, drumY, 0.52, 24);
  addCylinderZ(frame, 'axle-cap-right', 0.09, 0.08, brightGold, 1.58, drumY, 0.52, 24);

  // Five-column acrylic magazine. Tops of the columns line up; 49 balls leave one tube one ball short.
  const rack = new T.Group();
  rack.name = 'five-column-magazine';
  frame.add(rack);
  const rackBottom = 1.78, rackTop = 4.18, rackMid = (rackBottom + rackTop) / 2, rackHeight = rackTop - rackBottom;
  addBox(rack, 'magazine-back', 1.42, rackHeight, 0.05, darkGold, 0, rackMid, -0.28);
  addBox(rack, 'magazine-top-cap', 1.52, 0.07, 0.62, brightGold, 0, rackTop, 0.02);
  addBox(rack, 'magazine-bottom-cap', 1.52, 0.08, 0.62, gold, 0, rackBottom, 0.02);
  for (const x of [-0.72, 0.72]) addBox(rack, 'magazine-side', 0.055, rackHeight, 0.58, darkGold, x, rackMid, 0.02);
  for (let column = 0; column < 5; column++) {
    const x = (column - 2) * RACK_GAP_X;
    const tube = new T.Mesh(new T.CylinderGeometry(0.118, 0.118, rackHeight - 0.16, 20, 1, true), edgeGlass || glass);
    tube.name = `number-column-${column + 1}`;
    tube.position.set(x, rackMid, RACK_Z);
    rack.add(tube);
    if (column < 4) addBox(rack, 'magazine-divider', 0.016, rackHeight - 0.18, 0.03, brightGold, x + RACK_GAP_X / 2, rackMid, 0.30);
  }
  const rackFace = new T.Mesh(new T.BoxGeometry(1.38, rackHeight - 0.12, 0.016), glass);
  rackFace.name = 'magazine-front-glass';
  rackFace.position.set(0, rackMid, 0.32);
  rack.add(rackFace);
  addBox(frame, 'magazine-bridge', 1.20, 0.10, 0.55, gold, 0, 1.70, 0.04);

  // Transparent drum: thick gold front ring, clear wall, clear faces.
  const drumWall = new T.Mesh(new T.CylinderGeometry(drumRadius - 0.08, drumRadius - 0.08, drumDepth, 96, 1, true), edgeGlass || glass);
  drumWall.name = 'drum-wall';
  drumWall.rotation.x = Math.PI / 2;
  drumWall.position.set(0, drumY, 0);
  frame.add(drumWall);
  const frontGlass = new T.Mesh(new T.CircleGeometry(drumRadius - 0.11, 96), glass);
  frontGlass.name = 'drum-front-glass';
  frontGlass.position.set(0, drumY, drumDepth / 2 - 0.02);
  frame.add(frontGlass);
  const backGlass = new T.Mesh(new T.CircleGeometry(drumRadius - 0.11, 96), glass);
  backGlass.name = 'drum-back-glass';
  backGlass.position.set(0, drumY, -drumDepth / 2 + 0.02);
  backGlass.rotation.y = Math.PI;
  frame.add(backGlass);
  addRing(frame, 'rear-rim', drumRadius, 0.05, -drumDepth / 2, darkGold);
  addRing(frame, 'front-rim', drumRadius, 0.078, drumDepth / 2, brightGold);
  addRing(frame, 'front-rim-inner', drumRadius - 0.13, 0.022, drumDepth / 2 + 0.01, gold);
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI * 2 / 18;
    const x = Math.cos(a) * drumRadius, y = Math.sin(a) * drumRadius + drumY;
    addCylinderZ(frame, 'rim-bolt', 0.042, 0.04, darkGold, x, y, drumDepth / 2 + 0.055, 16);
  }

  // Six flat spokes on a gold hub. The hub turns; the drum shell stays fixed.
  const rotor = new T.Group();
  rotor.name = 'six-spoke-hub';
  rotor.position.set(0, drumY, 0.12);
  frame.add(rotor);
  addCylinderZ(rotor, 'hub', 0.24, 0.18, gold, 0, 0, 0, 48);
  addCylinderZ(rotor, 'hub-cap', 0.11, 0.22, brightGold, 0, 0, 0.02, 32);
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 3;
    const inner = 0.22, outer = 1.22;
    addFlatBar(rotor, `spoke-${i + 1}`,
      [Math.cos(angle) * inner, Math.sin(angle) * inner, 0],
      [Math.cos(angle) * outer, Math.sin(angle) * outer, 0],
      0.075, 0.028, brightGold);
    const tip = new T.Mesh(new T.SphereGeometry(0.045, 14, 10), darkGold);
    tip.position.set(Math.cos(angle) * outer, Math.sin(angle) * outer, 0);
    rotor.add(tip);
  }

  // Short clear vertical tube at the bottom centre, then a clear chute into the right-hand entry.
  const tube = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.36, 28, 1, true), edgeGlass || glass);
  tube.name = 'centre-exit-tube';
  tube.position.set(0, -1.28, 0.26);
  frame.add(tube);
  addCylinderZ(frame, 'exit-tube-rim', 0.16, 0.045, brightGold, 0, -1.08, 0.26, 28);
  addCylinderZ(frame, 'exit-tube-foot', 0.16, 0.04, gold, 0, -1.46, 0.30, 28);
  const selectorMouth = new T.Vector3(0, -1.10, 0.26);
  const tubeExit = new T.Vector3(0, -1.46, 0.32);

  // ----- Receiving tray -----
  // Local axes: +X to the right, +Y up, +Z toward the viewer.
  // Left run is long and nearly flat (a whisper of fall toward the left wall).
  // The floor then rises into a short higher pocket. A clear retainer at the
  // lip stays down for balls 1–6 and stands up to hold the special ball.
  const tray = new T.Group();
  tray.name = 'receiving-tray';
  tray.position.set(0.08, -1.98, 0.86);
  frame.add(tray);

  const leftInner = -1.18;
  const slopeStart = 0.10;
  const slopeEnd = 0.30;
  const rightEnd = 0.64;
  const leftEndY = -0.03;
  const slopeLowY = 0.0;
  const rightY = 0.24;
  const channelZ = 0.0;
  const innerDepth = 0.36;
  const wallT = 0.045;
  const floorT = 0.05;
  const leftWallH = 0.50;
  const rightWallH = 0.74;
  const zBack = -innerDepth / 2;
  const zFront = innerDepth / 2;

  const floorMat = new T.MeshStandardMaterial({ color: 0xc49645, metalness: 0.62, roughness: 0.36 });
  const samples = [];
  const pushSample = (x, y) => samples.push({ x, y });
  pushSample(leftInner - wallT, leftEndY);
  const flatSteps = 6;
  for (let i = 0; i <= flatSteps; i++) {
    const u = i / flatSteps;
    pushSample(leftInner + (slopeStart - leftInner) * u, leftEndY + (slopeLowY - leftEndY) * u);
  }
  const slopeSteps = 6;
  for (let i = 1; i <= slopeSteps; i++) {
    const u = i / slopeSteps;
    pushSample(slopeStart + (slopeEnd - slopeStart) * u, slopeLowY + (rightY - slopeLowY) * u);
  }
  pushSample(rightEnd, rightY);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    addSegment(tray, `tray-floor-${i}`, a.x, a.y, b.x, b.y, channelZ, innerDepth + wallT, floorT, floorMat);
  }

  // Back wall steps up with the right bay. The right bay's back wall is notched for the chute.
  addBox(tray, 'back-wall-left', slopeEnd - (leftInner - wallT), leftWallH, wallT, gold,
    (leftInner - wallT + slopeEnd) / 2, leftWallH / 2, zBack - wallT / 2);
  const notchW = 0.26;
  const notchBottom = rightY + 0.16;
  const rightBayX0 = slopeEnd;
  const rightBayX1 = rightEnd + wallT;
  const rightMid = (rightBayX0 + rightBayX1) / 2;
  addBox(tray, 'back-wall-right-sill', rightBayX1 - rightBayX0, notchBottom, wallT, gold,
    rightMid, notchBottom / 2, zBack - wallT / 2);
  const postW = (rightBayX1 - rightBayX0 - notchW) / 2;
  addBox(tray, 'notch-post-left', postW, rightWallH - notchBottom, wallT, brightGold,
    rightBayX0 + postW / 2, notchBottom + (rightWallH - notchBottom) / 2, zBack - wallT / 2);
  addBox(tray, 'notch-post-right', postW, rightWallH - notchBottom, wallT, brightGold,
    rightBayX1 - postW / 2, notchBottom + (rightWallH - notchBottom) / 2, zBack - wallT / 2);

  // Left end wall and right end wall (the right one repeats the notch so the entry reads from the side).
  addBox(tray, 'left-end-wall', wallT, leftWallH, innerDepth + wallT * 2, gold,
    leftInner - wallT / 2 - 0.01, leftWallH / 2, 0);
  addBox(tray, 'right-end-lower', wallT, notchBottom, innerDepth + wallT, gold,
    rightEnd + wallT / 2, notchBottom / 2, wallT * 0.1);
  addBox(tray, 'right-end-post-back', wallT, rightWallH - notchBottom, 0.08, brightGold,
    rightEnd + wallT / 2, notchBottom + (rightWallH - notchBottom) / 2, zBack + 0.04);
  addBox(tray, 'right-end-post-front', wallT, rightWallH - notchBottom, 0.08, brightGold,
    rightEnd + wallT / 2, notchBottom + (rightWallH - notchBottom) / 2, zFront - 0.06);

  // Gold rails above a clear front strip. The right rail steps up, matching the shape study.
  const leftGlassH = leftWallH - 0.08;
  const glassH = rightWallH - 0.10;
  const leftPane = addBox(tray, 'tray-front-glass-left', slopeEnd - leftInner, leftGlassH, 0.016, glass,
    (leftInner + slopeEnd) / 2, leftGlassH / 2 + 0.02, zFront + 0.012);
  const rightPane = addBox(tray, 'tray-front-glass-right', rightEnd - slopeEnd + wallT, glassH, 0.016, glass,
    (slopeEnd + rightEnd) / 2, glassH / 2 + 0.02, zFront + 0.012);
  leftPane.castShadow = false;
  rightPane.castShadow = false;
  addBox(tray, 'front-rail-left', slopeEnd - leftInner + wallT, 0.045, wallT, brightGold,
    (leftInner - wallT + slopeEnd) / 2, leftWallH - 0.02, zFront + wallT / 2);
  addBox(tray, 'front-rail-right', rightBayX1 - slopeEnd, 0.05, wallT, brightGold,
    (slopeEnd + rightBayX1) / 2, rightWallH - 0.03, zFront + wallT / 2);
  addBox(tray, 'front-step', wallT, rightWallH - leftWallH, wallT, gold,
    slopeEnd, leftWallH + (rightWallH - leftWallH) / 2, zFront + wallT / 2);
  // Lower gold sill in front of the glass so the strip is framed.
  addBox(tray, 'front-sill', rightEnd - leftInner + wallT * 2, 0.04, wallT, gold,
    (leftInner + rightEnd) / 2, 0.0, zFront + wallT / 2);

  // Clear retainer. Down (buried at the lip) while the six roll left; raised to keep the 7th in the pocket.
  const retainer = new T.Group();
  retainer.name = 'special-ball-retainer';
  retainer.position.set(slopeEnd, rightY, channelZ);
  retainer.userData.baseY = rightY;
  retainer.userData.travel = 0.26;
  tray.add(retainer);
  const retainerPanel = new T.Mesh(new T.BoxGeometry(0.018, 0.26, innerDepth * 0.92), materials.glass);
  retainerPanel.name = 'retainer-panel';
  retainerPanel.position.set(0, 0.13 - 0.26, 0);
  retainerPanel.castShadow = false;
  retainer.add(retainerPanel);
  const retainerRail = new T.Mesh(new T.BoxGeometry(0.03, 0.02, innerDepth * 0.92), brightGold);
  retainerRail.name = 'retainer-cap';
  retainerRail.position.set(0, 0.25 - 0.26, 0);
  retainer.add(retainerRail);

  function floorTopY(x) {
    if (x <= slopeStart) {
      const u = (x - leftInner) / (slopeStart - leftInner);
      return leftEndY + (slopeLowY - leftEndY) * u;
    }
    if (x <= slopeEnd) {
      const u = (x - slopeStart) / (slopeEnd - slopeStart);
      return slopeLowY + (rightY - slopeLowY) * u;
    }
    return rightY;
  }
  function floorAngle(x) {
    if (x <= slopeStart || x >= slopeEnd) return 0;
    return Math.atan2(rightY - slopeLowY, slopeEnd - slopeStart);
  }
  function pointOnFloor(x) {
    const y = floorTopY(x);
    const a = floorAngle(x);
    return new T.Vector3(x - Math.sin(a) * BALL_R, y + Math.cos(a) * BALL_R, channelZ);
  }

  const mainRestX = [];
  for (let i = 0; i < 6; i++) mainRestX.push(leftInner + 0.04 + BALL_R + i * (BALL_D + 0.014));
  const specialX = (slopeEnd + rightEnd) / 2;

  frame.updateMatrixWorld(true);
  const toWorld = v => tray.localToWorld(v.clone());
  const mainRests = mainRestX.map(x => toWorld(pointOnFloor(x)));
  const specialRest = toWorld(pointOnFloor(specialX));

  function rollPath(index) {
    const pts = [];
    const startX = specialX;
    const endX = mainRestX[index];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = startX + (endX - startX) * u;
      pts.push(toWorld(pointOnFloor(x)));
    }
    return pts;
  }

  const chuteEndLocal = pointOnFloor(specialX).add(new T.Vector3(0, 0.10, -0.04));
  const chuteEnd = toWorld(chuteEndLocal);
  // Clear chute from the centre tube down into the notched right-hand entry.
  const chuteDir = new T.Vector3().subVectors(chuteEnd, tubeExit);
  const chuteLen = chuteDir.length();
  const chute = new T.Mesh(new T.BoxGeometry(0.20, 0.16, chuteLen), edgeGlass || glass);
  chute.name = 'exit-chute';
  chute.position.copy(tubeExit).add(chuteEnd).multiplyScalar(0.5);
  chute.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), chuteDir.clone().normalize());
  chute.castShadow = false;
  frame.add(chute);
  addBeam(frame, 'chute-rail-left',
    [tubeExit.x - 0.10, tubeExit.y, tubeExit.z],
    [chuteEnd.x - 0.10, chuteEnd.y, chuteEnd.z], 0.012, brightGold);
  addBeam(frame, 'chute-rail-right',
    [tubeExit.x + 0.10, tubeExit.y, tubeExit.z],
    [chuteEnd.x + 0.10, chuteEnd.y, chuteEnd.z], 0.012, brightGold);

  const dropPath = [
    selectorMouth.clone(),
    tubeExit.clone(),
    chuteEnd.clone(),
    specialRest.clone()
  ];

  const trayFocus = toWorld(new T.Vector3((leftInner + rightEnd) / 2, 0.22, 0));
  const outlinePoint = (x, y, z) => toWorld(new T.Vector3(x, y, z));
  const trayOutline = {
    floor: samples.map(s => outlinePoint(s.x, s.y, zFront)),
    crest: [
      outlinePoint(leftInner - wallT, leftWallH, zFront),
      outlinePoint(slopeEnd, leftWallH, zFront),
      outlinePoint(slopeEnd, rightWallH, zFront),
      outlinePoint(rightEnd + wallT, rightWallH, zFront)
    ],
    glass: [
      outlinePoint(leftInner, 0.02, zFront + 0.02),
      outlinePoint(rightEnd, 0.02, zFront + 0.02),
      outlinePoint(rightEnd, glassH, zFront + 0.02),
      outlinePoint(leftInner, glassH, zFront + 0.02)
    ]
  };

  // Groups the fallback renderer and older diagnostics still look up.
  tray.userData.slotLength = rightEnd - leftInner;
  tray.userData.slotWidth = innerDepth;
  tray.userData.openAt = 'none';
  const mainLane = new T.Group();
  mainLane.name = 'left-run';
  mainLane.position.set((leftInner + slopeStart) / 2, 0.08, 0);
  mainLane.userData.slotLength = slopeStart - leftInner;
  mainLane.userData.slotWidth = innerDepth;
  mainLane.userData.openAt = 'right';
  tray.add(mainLane);
  const specialLane = new T.Group();
  specialLane.name = 'right-pocket';
  specialLane.position.set((slopeEnd + rightEnd) / 2, rightY + 0.08, 0);
  specialLane.userData.slotLength = rightEnd - slopeEnd;
  specialLane.userData.slotWidth = innerDepth;
  specialLane.userData.openAt = 'left';
  tray.add(specialLane);

  frame.updateMatrixWorld(true);
  return {
    frame, rotor, selectorMouth, tubeExit, chuteEnd,
    selectorOcclusion: tubeExit.clone(),
    receiverEntryStart: chuteEnd.clone(),
    receiverJunction: specialRest.clone(),
    receiverEntryLane: tray,
    mainResultSlot: mainLane,
    specialResultSlot: specialLane,
    diverterGatePivot: retainer,
    drumRadius, drumDepth, drumHalfDepth: drumDepth / 2,
    rackPosition, mainRests, specialRest, rollPath, dropPath, trayFocus, trayOutline,
    spokeCount: 6
  };
}

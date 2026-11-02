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

function makeWoodMaterial(vertical) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  g.fillStyle = '#e2c79a';
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i++) {
    const shade = 120 + Math.floor(Math.random() * 70);
    g.strokeStyle = `rgba(${shade},${Math.floor(shade * 0.78)},${Math.floor(shade * 0.48)},${0.10 + Math.random() * 0.22})`;
    g.lineWidth = 0.7 + Math.random() * 2.4;
    g.beginPath();
    if (vertical) {
      const x = Math.random() * 256;
      g.moveTo(x, 0);
      g.lineTo(x + (Math.random() * 10 - 5), 512);
    } else {
      const y = Math.random() * 512;
      g.moveTo(0, y);
      g.lineTo(256, y + (Math.random() * 14 - 7));
    }
    g.stroke();
  }
  const texture = new THREE_DEFAULT.CanvasTexture(canvas);
  texture.wrapS = THREE_DEFAULT.RepeatWrapping;
  texture.wrapT = THREE_DEFAULT.RepeatWrapping;
  texture.repeat.set(vertical ? 0.8 : 1.6, vertical ? 1.4 : 0.7);
  texture.colorSpace = THREE_DEFAULT.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE_DEFAULT.MeshStandardMaterial({ map: texture, color: 0xfff6e8, roughness: 0.78, metalness: 0.0 });
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
  // Base stays under the drum, but reaches left to carry the long tray arm.
  // Plinth dropped with the tray so the catch floor can sit under the drum ring.
  addBox(frame, 'lower-cabinet', 3.70, 0.36, 1.70, darkGold, -0.42, -3.08, 0.62);
  addBox(frame, 'cabinet-top', 3.55, 0.04, 1.60, gold, -0.42, -2.90, 0.68);
  addBox(frame, 'cabinet-front-lip', 3.58, 0.05, 0.05, brightGold, -0.42, -2.92, 1.46);
  const plate = new T.Mesh(new T.BoxGeometry(1.72, 0.26, 0.02), new T.MeshStandardMaterial({
    map: nameplateTexture(), metalness: 0.35, roughness: 0.45, color: 0xfff1c4
  }));
  plate.name = 'hkjc-nameplate';
  plate.position.set(0.02, -3.08, 1.48);
  frame.add(plate);
  for (const [x, z] of [[-1.95, 0.62], [1.15, 0.62], [-1.95, -0.15], [1.15, -0.15]]) {
    addBox(frame, 'foot-stem', 0.09, 0.22, 0.09, darkGold, x, -3.38, z);
    const foot = new T.Mesh(new T.CylinderGeometry(0.13, 0.15, 0.07, 28), gold);
    foot.name = 'round-foot';
    foot.position.set(x, -3.50, z);
    frame.add(foot);
  }

  // Side standards holding the drum ring.
  for (const x of [-1.62, 1.62]) {
    addBeam(frame, 'side-standard', [x, -2.90, 0.05], [x, 0.95, 0.05], 0.055, darkGold);
    addBeam(frame, 'side-standard-front', [x * 0.98, -2.90, 0.55], [x * 0.92, -0.20, 0.55], 0.04, gold);
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
  const tube = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.26, 28, 1, true), edgeGlass || glass);
  tube.name = 'centre-exit-tube';
  tube.position.set(0, -1.16, 0.28);
  frame.add(tube);
  addCylinderZ(frame, 'exit-tube-rim', 0.16, 0.045, brightGold, 0, -1.02, 0.28, 28);
  addCylinderZ(frame, 'exit-tube-foot', 0.16, 0.04, gold, 0, -1.28, 0.32, 28);
  const selectorMouth = new T.Vector3(0, -1.04, 0.28);
  const tubeExit = new T.Vector3(0, -1.28, 0.34);

  // Hand-sketch tray: a rectangular wood block whose interior floor
  // peaks under the centre chute and slopes down both ways. The left
  // slope is long (six balls); the right slope is short (the special ball).
  const tray = new T.Group();
  tray.name = 'receiving-tray';
  // Catch floor sits well below the drum exit. The trough body stays in front;
  // the T-stem reaches back under the chute. Local x=0 is the flat centre.
  tray.position.set(0, -2.82, 1.48);
  frame.add(tray);

  const woodWall = makeWoodMaterial(true);
  const woodFloor = makeWoodMaterial(false);
  const woodGroove = new T.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.6, metalness: 0.04 });
  const trayGlass = glass.clone();
  trayGlass.opacity = 0.42;
  trayGlass.color = new T.Color(0xd5e8ea);

  const wallT = 0.10;
  const innerW = 0.42;
  const zIn0 = -innerW / 2;
  const zIn1 = innerW / 2;
  const leftInner = -1.64;
  const leftOuter = leftInner - wallT;
  const endY = 0.24;
  const peakY = 0.58;
  // Flat landing between the wings. The same plane runs back as the tunnel floor.
  const flatHalf = 0.24;
  // Same pitch on both wings. The right wing is only shorter, so it drops less.
  const leftRun = -flatHalf - leftInner;
  const slope = (peakY - endY) / leftRun;
  const rightRun = 0.34;
  const rightInner = flatHalf + rightRun;
  const rightOuter = rightInner + wallT;
  const rightEndY = peakY - slope * rightRun;
  // Rear of the T-stem, in tray space. World z lands just behind the chute mouth
  // so the ball drops onto the track and rolls forward into the trough.
  const tunnelRear = 0.10 - tray.position.z;
  const channelZ = 0;
  const zBack = zIn0 - wallT / 2;
  const zFront = zIn1 + wallT / 2;
  const glassSeat = 0.15;
  const capH = 0.045;

  function addTopWall(parent, name, x0, top0, x1, top1, zCenter, depth, material) {
    const z0 = zCenter - depth / 2;
    const z1 = zCenter + depth / 2;
    const positions = new Float32Array([
      x0, 0, z0, x1, 0, z0, x1, top1, z0, x0, top0, z0,
      x0, 0, z1, x1, 0, z1, x1, top1, z1, x0, top0, z1
    ]);
    const indices = [
      0, 2, 1, 0, 3, 2,
      4, 5, 6, 4, 6, 7,
      0, 1, 5, 0, 5, 4,
      3, 6, 2, 3, 7, 6,
      0, 4, 7, 0, 7, 3,
      1, 2, 6, 1, 6, 5
    ];
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addStrip(parent, name, x0, y0, x1, y1, z, height, thickness, material) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const mesh = new T.Mesh(new T.BoxGeometry(len, height, thickness), material);
    mesh.name = name;
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    mesh.position.set(midX + nx * height / 2, midY + ny * height / 2, z);
    mesh.rotation.z = angle;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // One profile: left slope, flat centre, right slope. Every board uses these points.
  const zF = innerW / 2;
  const zB = -innerW / 2;
  const zT = tunnelRear;
  const backLift = 0.28;
  const glassH = 0.16;
  const glassLean = 0.055;
  woodWall.side = T.DoubleSide;
  woodFloor.side = T.DoubleSide;
  trayGlass.side = T.DoubleSide;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const profile = [
    V(leftInner, endY, 0),
    V(-flatHalf, peakY, 0),
    V(flatHalf, peakY, 0),
    V(rightInner, rightEndY, 0)
  ];
  function addRibbon(name, bottom, top, material) {
    const positions = [];
    const indices = [];
    for (let i = 0; i < bottom.length; i++) {
      positions.push(bottom[i].x, bottom[i].y, bottom[i].z, top[i].x, top[i].y, top[i].z);
    }
    for (let i = 0; i < bottom.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tray.add(mesh);
    return mesh;
  }
  function addSolidFromTop(name, verts, quads, material) {
    // verts: top surface. quads: arrays of 4 top-vertex indices. Skirt follows the first quad's outer loop? 
    // Caller passes an explicit perimeter of top-vertex indices, in order.
    const positions = [];
    const indices = [];
    const addV = (x, y, z) => { positions.push(x, y, z); return positions.length / 3 - 1; };
    const topId = verts.map(v => addV(v.x, v.y, v.z));
    const botId = verts.map(v => addV(v.x, 0, v.z));
    const tri = (a, b, c) => indices.push(a, b, c);
    for (const q of quads) {
      const [a, b, c, d] = q.map(i => topId[i]);
      tri(a, b, c); tri(a, c, d);
      const [ba, bb, bc, bd] = q.map(i => botId[i]);
      tri(ba, bc, bb); tri(ba, bd, bc);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tray.add(mesh);
    return mesh;
  }
  // Floor top of the visible trough. The centre flat continues back as a thin track,
  // not a deep block, so the stem can pass under the drum without filling it.
  const floorVerts = [
    V(leftInner, endY, zF), V(-flatHalf, peakY, zF), V(flatHalf, peakY, zF), V(rightInner, rightEndY, zF),
    V(leftInner, endY, zB), V(-flatHalf, peakY, zB), V(flatHalf, peakY, zB), V(rightInner, rightEndY, zB)
  ];
  addSolidFromTop('trough-body', floorVerts, [
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6]
  ], woodFloor);
  const perimeter = [0, 1, 2, 3, 7, 6, 5, 4];
  const skirtBottom = perimeter.map(i => V(floorVerts[i].x, 0, floorVerts[i].z));
  const skirtTop = perimeter.map(i => floorVerts[i].clone());
  skirtBottom.push(skirtBottom[0].clone());
  skirtTop.push(skirtTop[0].clone());
  addRibbon('trough-skirt', skirtBottom, skirtTop, woodWall);

  const slab = 0.06;
  const tunnelTop = [
    V(-flatHalf, peakY, zB), V(flatHalf, peakY, zB), V(flatHalf, peakY, zT), V(-flatHalf, peakY, zT)
  ];
  const tunnelBot = tunnelTop.map(p => V(p.x, p.y - slab, p.z));
  addRibbon('tunnel-floor', tunnelBot, tunnelTop, woodFloor);
  addRibbon('tunnel-floor-underside', [...tunnelTop].reverse().map(p => p.clone()), [...tunnelBot].reverse().map(p => p.clone()), woodFloor);
  addRibbon('tunnel-slab-left', [tunnelBot[3], tunnelBot[0]], [tunnelTop[3], tunnelTop[0]], woodWall);
  addRibbon('tunnel-slab-right', [tunnelBot[1], tunnelBot[2]], [tunnelTop[1], tunnelTop[2]], woodWall);
  addBox(tray, 'tunnel-rear-lip', flatHalf * 2, 0.11, 0.04, woodWall, 0, peakY + 0.055, zT);

  // Front glass: one ribbon. Bottom sits on the floor's front edge; top stays a constant height above it.
  const glassBottom = profile.map(p => V(p.x, p.y, zF));
  const glassTop = profile.map(p => V(p.x, p.y + glassH, zF - glassLean));
  const frontGlassRibbon = addRibbon('front-glass', glassBottom, glassTop, trayGlass);
  frontGlassRibbon.castShadow = false;

  // Back boards: one ribbon per side that turns the corner into the tunnel rail.
  // Top edge is the floor profile plus a constant rise, including across the flat.
  const leftBackBottom = [V(leftInner, endY, zB), V(-flatHalf, peakY, zB), V(-flatHalf, peakY, zT)];
  const leftBackTop = leftBackBottom.map(p => V(p.x, p.y + backLift, p.z));
  addRibbon('back-left', leftBackBottom, leftBackTop, woodWall);
  const rightBackBottom = [V(rightInner, rightEndY, zB), V(flatHalf, peakY, zB), V(flatHalf, peakY, zT)];
  const rightBackTop = rightBackBottom.map(p => V(p.x, p.y + backLift, p.z));
  addRibbon('back-right', rightBackBottom, rightBackTop, woodWall);

  addBox(tray, 'left-end-wall', wallT, endY + backLift, zF - zB, woodWall,
    leftOuter + wallT / 2, (endY + backLift) / 2, (zF + zB) / 2);
  addBox(tray, 'right-end-wall', wallT, rightEndY + backLift, zF - zB, woodWall,
    rightOuter - wallT / 2, (rightEndY + backLift) / 2, (zF + zB) / 2);

  // Empty group so the old gate call has nothing visible to raise across the peak.
  const retainer = new T.Group();
  retainer.name = 'special-ball-retainer';
  retainer.position.set(0, peakY, 0);
  retainer.userData.baseY = peakY;
  retainer.userData.travel = 0;
  tray.add(retainer);

  const samples = [
    { x: leftInner, y: endY },
    { x: -flatHalf, y: peakY },
    { x: flatHalf, y: peakY },
    { x: rightInner, y: rightEndY }
  ];

  function floorTopY(x) {
    const clamped = Math.max(leftInner, Math.min(rightInner, x));
    if (clamped <= -flatHalf) {
      const u = (clamped - leftInner) / (-flatHalf - leftInner);
      return endY + (peakY - endY) * u + 0.02;
    }
    if (clamped >= flatHalf) {
      const u = (clamped - flatHalf) / (rightInner - flatHalf);
      return peakY + (rightEndY - peakY) * u + 0.02;
    }
    return peakY + 0.02;
  }
  function floorAngle(x) {
    const pitch = Math.atan2(peakY - endY, -flatHalf - leftInner);
    if (x < -flatHalf) return pitch;
    if (x > flatHalf) return -pitch;
    return 0;
  }
  function pointOnFloor(x) {
    const y = floorTopY(x);
    const a = floorAngle(x);
    return new T.Vector3(x - Math.sin(a) * BALL_R, y + Math.cos(a) * BALL_R, channelZ);
  }

  const mainRestX = [];
  for (let i = 0; i < 6; i++) mainRestX.push(leftInner + 0.06 + BALL_R + i * 0.23);
  const specialX = rightInner - 0.06 - BALL_R;

  frame.updateMatrixWorld(true);
  const toWorld = v => tray.localToWorld(v.clone());
  const mainRests = mainRestX.map(x => toWorld(pointOnFloor(x)));
  const specialRest = toWorld(pointOnFloor(specialX));

  function pathBetween(startX, endX) {
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      pts.push(toWorld(pointOnFloor(startX + (endX - startX) * u)));
    }
    return pts;
  }
  function rollPath(index) { return pathBetween(0, mainRestX[index]); }
  const specialRoll = pathBetween(0, specialX);

  // Ball centre: straight down from the chute mouth onto the long track, then forward.
  const landZ = tubeExit.z - tray.position.z;
  const landLocal = new T.Vector3(0, peakY + 0.02 + BALL_R, landZ);
  const chuteEnd = toWorld(landLocal);
  const peakRest = toWorld(pointOnFloor(0));
  const dropPath = [
    selectorMouth.clone(),
    tubeExit.clone(),
    chuteEnd.clone(),
    peakRest.clone()
  ];

  const trayFocus = toWorld(new T.Vector3((leftInner + rightInner) / 2, peakY * 0.55, 0));
  const outlinePoint = (x, y, z) => toWorld(new T.Vector3(x, y, z));
  const trayOutline = {
    floor: samples.map(s => outlinePoint(s.x, s.y, zFront)),
    crest: [
      outlinePoint(leftOuter, endY + 0.30, zBack),
      outlinePoint(-flatHalf, peakY + 0.30, zBack),
      outlinePoint(flatHalf, peakY + 0.30, zBack),
      outlinePoint(rightOuter, rightEndY + 0.30, zBack)
    ],
    glass: [
      outlinePoint(leftInner, endY + 0.04, zFront),
      outlinePoint(-flatHalf, peakY + 0.04 + glassSeat, zFront),
      outlinePoint(flatHalf, peakY + 0.04 + glassSeat, zFront),
      outlinePoint(rightInner, rightEndY + 0.04, zFront)
    ]
  };

  // Groups the fallback renderer and older diagnostics still look up.
  tray.userData.slotLength = rightInner - leftInner;
  tray.userData.slotWidth = innerW;
  tray.userData.openAt = 'none';
  const mainLane = new T.Group();
  mainLane.name = 'left-run';
  mainLane.position.set(leftInner / 2, endY, 0);
  mainLane.userData.slotLength = -leftInner;
  mainLane.userData.slotWidth = innerW;
  mainLane.userData.openAt = 'right';
  tray.add(mainLane);
  const specialLane = new T.Group();
  specialLane.name = 'right-pocket';
  specialLane.position.set(rightInner / 2, endY, 0);
  specialLane.userData.slotLength = rightInner;
  specialLane.userData.slotWidth = innerW;
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
    rackPosition, mainRests, specialRest, rollPath, specialRoll, dropPath, trayFocus, trayOutline,
    spokeCount: 6
  };
}

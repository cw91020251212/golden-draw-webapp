import * as THREE_DEFAULT from './three.module.js';

// Rebuilt from the approved front reference, real-machine photos, receiver
// reference and visible events in the supplied video. Hidden transfer routes
// are deliberately not modelled.
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
function addRing(parent, name, radius, tube, z, material, segments = 128) {
  const mesh = new THREE_DEFAULT.Mesh(new THREE_DEFAULT.TorusGeometry(radius, tube, 14, segments), material);
  mesh.name = name;
  mesh.position.set(0, 0.05, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function makeReceiverLane(parent, { name, length, width, x, y, z, yaw, material, trim, openAt }) {
  const lane = new THREE_DEFAULT.Group();
  lane.name = name;
  lane.position.set(x, y, z);
  lane.rotation.y = yaw;
  lane.userData.slotLength = length;
  lane.userData.slotWidth = width;
  lane.userData.openAt = openAt;
  parent.add(lane);
  addBox(lane, `${name}-floor`, length, 0.055, width, material, 0, 0, 0);
  const railHeight = 0.20, railThickness = 0.045;
  addBox(lane, `${name}-left-rail`, length, railHeight, railThickness, trim, 0, railHeight / 2, -width / 2);
  addBox(lane, `${name}-right-rail`, length, railHeight, railThickness, trim, 0, railHeight / 2, width / 2);
  if (openAt !== 'left' && openAt !== 'both') addBox(lane, `${name}-left-end`, railThickness, railHeight, width, trim, -length / 2, railHeight / 2, 0);
  if (openAt !== 'right' && openAt !== 'both') addBox(lane, `${name}-right-end`, railThickness, railHeight, width, trim, length / 2, railHeight / 2, 0);
  return lane;
}

function addBluePlaque(T, parent, name, label, x, y, z, width) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = '#284c48';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff4d5';
  context.font = 'bold 36px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const plaque = new T.Mesh(new T.PlaneGeometry(width, 0.16), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
  plaque.name = name;
  plaque.position.set(x, y, z);
  plaque.renderOrder = 3;
  parent.add(plaque);
  return plaque;
}

export function buildMachine(_THREE, root, materials) {
  const T = _THREE || THREE_DEFAULT;
  const { gold, darkGold, brightGold, glass, edgeGlass } = materials;
  const frame = new T.Group();
  frame.name = 'mark-six-machine-rebuilt';
  root.add(frame);

  // Broad lower housing, base and feet.
  addBox(frame, 'lower-cabinet', 2.72, 0.68, 1.50, darkGold, 0, -2.13, 0.02);
  addBox(frame, 'cabinet-front-panel', 2.54, 0.42, 0.055, gold, 0, -2.15, 0.80);
  addBox(frame, 'cabinet-front-inset', 2.25, 0.22, 0.025, darkGold, 0, -2.16, 0.84);
  addBox(frame, 'cabinet-name-plate', 0.92, 0.095, 0.025, brightGold, 0, -2.13, 0.86);
  for (const x of [-1.12, 1.12]) {
    addBox(frame, 'cabinet-foot-stem', 0.11, 0.24, 0.13, darkGold, x, -2.58, 0.0);
    const foot = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.10, 32), gold);
    foot.name = 'round-adjustable-foot'; foot.position.set(x, -2.70, 0); frame.add(foot);
  }

  // Metal supports connect the round chamber to the wide base.
  for (const x of [-1.18, 1.18]) {
    addBeam(frame, 'outer-upright-support', [x, -1.83, -0.18], [x * 0.93, 1.02, -0.18], 0.055, darkGold);
    addBeam(frame, 'front-brace-support', [x, -1.79, 0.48], [x * 0.78, -0.68, 0.48], 0.045, gold);
    addCylinderZ(frame, 'support-joint', 0.105, 0.10, brightGold, x * 0.93, 1.00, 0.49, 32);
  }
  addBeam(frame, 'upper-drum-crossbar', [-1.10, 1.02, -0.16], [1.10, 1.02, -0.16], 0.045, darkGold);
  addBeam(frame, 'lower-drum-crossbar', [-1.17, -1.47, -0.12], [1.17, -1.47, -0.12], 0.055, darkGold);

  // Tall, narrow seven-column numbered-ball magazine.
  const rack = new T.Group(); rack.name = 'seven-column-number-ball-magazine'; frame.add(rack);
  const rackBottom = 1.72, rackTop = 4.24, rackMid = (rackBottom + rackTop) / 2, rackHeight = rackTop - rackBottom;
  addBox(rack, 'magazine-back', 1.58, rackHeight, 0.055, darkGold, 0, rackMid, -0.29);
  addBox(rack, 'magazine-top-cap', 1.70, 0.085, 0.68, brightGold, 0, rackTop, 0.0);
  addBox(rack, 'magazine-bottom-cap', 1.70, 0.10, 0.68, gold, 0, rackBottom, 0.0);
  for (const x of [-0.82, 0.82]) addBox(rack, 'magazine-side-frame', 0.06, rackHeight, 0.68, darkGold, x, rackMid, 0.0);
  for (let column = 0; column < 7; column++) {
    const x = (column - 3) * 0.20;
    const tube = new T.Mesh(new T.CylinderGeometry(0.103, 0.103, rackHeight - 0.18, 18, 1, true), edgeGlass || glass);
    tube.name = `number-ball-column-${column + 1}`; tube.position.set(x, rackMid, 0.12); tube.castShadow = false; rack.add(tube);
    if (column < 6) addBox(rack, 'magazine-divider', 0.018, rackHeight - 0.14, 0.035, brightGold, x + 0.10, rackMid, 0.36);
  }
  const rackFace = new T.Mesh(new T.BoxGeometry(1.60, rackHeight - 0.11, 0.018), glass);
  rackFace.name = 'magazine-front-glazing'; rackFace.position.set(0, rackMid, 0.40); rackFace.renderOrder = 2; rack.add(rackFace);
  addBox(frame, 'magazine-to-drum-bridge', 1.42, 0.14, 0.66, gold, 0, 1.60, 0.02);

  // Shallow transparent circular drum with visible depth, front glazing and thick metal rings.
  const drumRadius = 1.48, drumDepth = 1.08;
  const drumWall = new T.Mesh(new T.CylinderGeometry(1.42, 1.42, drumDepth, 96, 1, true), edgeGlass || glass);
  drumWall.name = 'transparent-drum-side-wall'; drumWall.rotation.x = Math.PI / 2; drumWall.position.set(0, 0.05, 0); drumWall.castShadow = false; frame.add(drumWall);
  const frontGlass = new T.Mesh(new T.CircleGeometry(1.405, 96), glass);
  frontGlass.name = 'transparent-front-face'; frontGlass.position.set(0, 0.05, drumDepth / 2 - 0.015); frontGlass.renderOrder = 1; frame.add(frontGlass);
  const backGlass = new T.Mesh(new T.CircleGeometry(1.405, 96), glass);
  backGlass.name = 'transparent-back-face'; backGlass.position.set(0, 0.05, -drumDepth / 2 + 0.015); backGlass.rotation.y = Math.PI; backGlass.renderOrder = -1; frame.add(backGlass);
  addRing(frame, 'rear-circular-support-rim', drumRadius, 0.055, -drumDepth / 2, darkGold);
  addRing(frame, 'front-thick-brass-rim', drumRadius, 0.082, drumDepth / 2, brightGold);
  addRing(frame, 'inner-rim-detail', 1.365, 0.026, drumDepth / 2 + 0.006, gold);
  addRing(frame, 'rear-inner-rim-detail', 1.365, 0.022, -drumDepth / 2 - 0.006, darkGold);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16, x = Math.cos(a) * drumRadius, y = Math.sin(a) * drumRadius + 0.05;
    addCylinderZ(frame, 'front-rim-fastener', 0.045, 0.045, darkGold, x, y, drumDepth / 2 + 0.06, 20);
    const cap = new T.Mesh(new T.SphereGeometry(0.026, 12, 8), brightGold); cap.position.set(x, y, drumDepth / 2 + 0.09); frame.add(cap);
  }

  // Three principal spokes and three fine braces; no invented half-circle pickup rail.
  const rotor = new T.Group(); rotor.name = 'clockwise-three-spoke-mixing-rotor'; rotor.position.set(0, 0.05, 0.19); frame.add(rotor);
  addCylinderZ(rotor, 'rotor-central-hub', 0.255, 0.22, gold, 0, 0, 0, 56);
  addCylinderZ(rotor, 'rotor-hub-cap', 0.12, 0.25, brightGold, 0, 0, 0.02, 48);
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 2 + i * Math.PI * 2 / 3, inner = 0.18, outer = 1.22;
    const x1 = Math.cos(angle) * inner, y1 = Math.sin(angle) * inner;
    const x2 = Math.cos(angle) * outer, y2 = Math.sin(angle) * outer;
    addBeam(rotor, `primary-rotor-spoke-${i + 1}`, [x1, y1, 0.02], [x2, y2, 0.02], 0.034, brightGold);
    const paddle = addBox(rotor, `rotor-paddle-${i + 1}`, 0.30, 0.22, 0.07, gold, Math.cos(angle) * 0.91, Math.sin(angle) * 0.91, 0.025);
    paddle.rotation.z = angle + 0.38;
    const joint = new T.Mesh(new T.SphereGeometry(0.085, 20, 14), darkGold); joint.position.set(x2, y2, 0.04); rotor.add(joint);
  }
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 6 + i * Math.PI * 2 / 3;
    addBeam(rotor, `secondary-rotor-brace-${i + 1}`,
      [Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, -0.015],
      [Math.cos(angle) * 0.98, Math.sin(angle) * 0.98, -0.015], 0.014, darkGold);
  }

  // Only the visible portion of the bottom-centre selector tube is represented.
  const selectorTube = new T.Mesh(new T.CylinderGeometry(0.125, 0.125, 0.46, 36, 1, true), edgeGlass || glass);
  selectorTube.name = 'visible-bottom-center-selector-tube'; selectorTube.position.set(0, -1.48, 0.47); selectorTube.castShadow = false; frame.add(selectorTube);
  addCylinderZ(frame, 'selector-tube-upper-rim', 0.15, 0.055, brightGold, 0, -1.23, 0.47, 36);
  addCylinderZ(frame, 'selector-tube-lower-rim', 0.15, 0.055, darkGold, 0, -1.72, 0.47, 36);
  const selectorMouth = new T.Vector3(0, -1.25, 0.48);
  const selectorOcclusion = new T.Vector3(0, -1.93, 0.66);

  // One shared rear approach meets the two coplanar outlet lanes at a single junction.
  // The hidden connection from the selector tube to this visible rear entrance is absent.
  addBox(frame, 'receiver-platform', 3.10, 0.20, 1.64, darkGold, -0.05, -1.76, 0.86);
  const traySurface = new T.MeshStandardMaterial({ color: 0x38352e, metalness: 0.28, roughness: 0.58 });
  const receiverEntryLane = makeReceiverLane(frame, {
    name: 'shared-rear-entry-guide', length: 0.62, width: 0.56,
    x: 0.35, y: -1.63, z: 0.51, yaw: -Math.PI / 2,
    material: traySurface, trim: brightGold, openAt: 'both'
  });
  const mainResultSlot = makeReceiverLane(frame, {
    name: 'long-left-main-result-lane', length: 2.02, width: 0.56,
    x: -0.66, y: -1.63, z: 0.82, yaw: 0, material: traySurface, trim: brightGold, openAt: 'right'
  });
  const specialResultSlot = makeReceiverLane(frame, {
    name: 'short-right-special-pocket', length: 0.98, width: 0.56,
    x: 0.76, y: -1.63, z: 1.11, yaw: -0.62, material: traySurface, trim: brightGold, openAt: 'left'
  });
  addBluePlaque(T, frame, 'main-result-blue-plaque', '正選號 1–6', -0.66, -1.76, 1.695, 0.92);
  addBluePlaque(T, frame, 'special-result-blue-plaque', '特別號', 0.76, -1.76, 1.695, 0.92);
  const receiverEntryStart = new T.Vector3(0.35, -1.485, 0.20);
  const receiverJunction = new T.Vector3(0.35, -1.485, 0.82);

  // The closed blade favours the long left lane; its exact real-machine hinge is unknown.
  const diverterGatePivot = new T.Group(); diverterGatePivot.name = 'receiver-special-diverter';
  diverterGatePivot.position.set(receiverJunction.x, -1.63, receiverJunction.z); frame.add(diverterGatePivot);
  const blade = addBox(diverterGatePivot, 'simplified-diverter-blade', 0.10, 0.19, 0.42, gold, 0, 0.09, 0.21);
  blade.rotation.y = -0.62;
  const hinge = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.25, 20), darkGold);
  hinge.name = 'simplified-gate-hinge'; hinge.position.set(0, 0.10, 0); diverterGatePivot.add(hinge);
  for (const x of [-0.98, 0.98]) addBeam(frame, 'receiver-support-post', [x, -1.79, 0.45], [x * 0.72, -1.42, 0.16], 0.05, darkGold);

  frame.updateMatrixWorld(true);
  return { frame, rotor, selectorMouth, selectorOcclusion, receiverEntryStart, receiverJunction,
    receiverEntryLane, mainResultSlot, specialResultSlot, diverterGatePivot,
    drumRadius, drumDepth, drumHalfDepth: drumDepth / 2 };
}

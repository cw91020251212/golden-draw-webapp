import * as THREE from '../three.module.js';

const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const _forward = new THREE.Vector3();

// DeviceOrientationControls quaternion from Three.js r170. The extra -90°
// turn makes the camera look out of the back of the phone, not the top.
function setDeviceQuaternion(quaternion, alpha, beta, gamma, orient) {
  _euler.set(beta, alpha, -gamma, 'YXZ');
  quaternion.setFromEuler(_euler);
  quaternion.multiply(_q1);
  quaternion.multiply(_q0.setFromAxisAngle(_zee, -orient));
}

function screenAngle() {
  return typeof window.orientation === 'number' ? window.orientation : 0;
}

function circle(radius, color, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

function makeRoach() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(0.07, 12, 8);
  const rim = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshBasicMaterial({ color: 0xe6dfd2, side: THREE.BackSide })
  );
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: 0x241c16 }));
  rim.scale.set(1.12, 0.42, 2.1);
  body.scale.set(1, 0.38, 1.95);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x3a2e24 })
  );
  head.position.set(0, 0.01, -0.07);
  group.add(rim, body, head, circle(0.07, 0x000000, 0.45));
  group.userData.solids = [rim, body, head];
  return group;
}

function makeSpider() {
  const group = new THREE.Group();
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xe6dfd2, side: THREE.BackSide });
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x2c241c });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), bodyMat);
  const abdomenRim = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 8), rimMat);
  abdomen.scale.set(1, 0.55, 1.25);
  abdomenRim.scale.set(1, 0.55, 1.25);
  abdomen.position.z = 0.04;
  abdomenRim.position.z = 0.04;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), bodyMat);
  const headRim = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), rimMat);
  head.position.set(0, 0.02, -0.06);
  headRim.position.set(0, 0.02, -0.06);
  group.add(abdomenRim, abdomen, headRim, head);
  const legMat = new THREE.MeshBasicMaterial({ color: 0x1a1612 });
  for (let i = 0; i < 4; i += 1) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.012), legMat);
      leg.position.set(side * 0.07, 0.02, -0.03 + i * 0.025);
      leg.rotation.y = side * (0.4 + i * 0.18);
      group.add(leg);
    }
  }
  group.add(circle(0.1, 0x000000, 0.45));
  group.userData.solids = group.children.filter((child) => child.geometry && child.geometry.type !== 'CircleGeometry');
  return group;
}

function makeSlipper() {
  const group = new THREE.Group();
  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.018, 0.26),
    new THREE.MeshBasicMaterial({ color: 0x6a3b2c })
  );
  sole.position.y = 0.02;
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.045, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x8d4e36 })
  );
  upper.position.set(0, 0.045, 0.03);
  const toe = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.02, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x9a6248 })
  );
  toe.position.set(0, 0.028, -0.1);
  group.add(circle(0.16, 0x000000, 0.4), sole, upper, toe);
  return group;
}

function makePaper() {
  const group = new THREE.Group();
  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.008, 0.26),
    new THREE.MeshBasicMaterial({ color: 0xf3efe4 })
  );
  sheet.position.y = 0.02;
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.01, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x2a2722 })
  );
  stripe.position.set(0, 0.026, -0.04);
  group.add(sheet, stripe);
  return group;
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 30);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.2, 0);

  const grid = new THREE.GridHelper(6, 12, 0xb7ab9a, 0x6d675e);
  grid.position.y = 0.001;
  grid.visible = false;
  scene.add(grid);

  const slipper = makeSlipper();
  const paper = makePaper();
  const heldPaper = makePaper();
  heldPaper.scale.setScalar(0.55);
  heldPaper.position.set(0.14, -0.2, -0.42);
  heldPaper.rotation.x = -0.6;
  heldPaper.visible = false;
  camera.add(heldPaper);
  scene.add(camera, slipper, paper);

  const meshes = new Map();
  let desktop = false;
  let mouseLook = true;
  let deskBearing = 0;
  let deskPitch = 0.75;
  let height = 1.2;
  let silhouette = false;
  let seenOrientation = false;
  let compassAccuracy = null;
  let deviceEvent = null;

  window.addEventListener('deviceorientation', (event) => {
    deviceEvent = event;
    if (event.alpha != null || event.beta != null) seenOrientation = true;
    if (typeof event.webkitCompassAccuracy === 'number') {
      compassAccuracy = event.webkitCompassAccuracy;
    }
  });

  function resize() {
    const width = window.innerWidth;
    const heightPx = window.innerHeight;
    renderer.setSize(width, heightPx, false);
    camera.aspect = width / Math.max(1, heightPx);
    camera.updateProjectionMatrix();
  }

  function applyPose() {
    camera.position.y = height;
    if (mouseLook || !seenOrientation || !deviceEvent) {
      camera.rotation.set(-deskPitch, -deskBearing, 0);
      return;
    }
    const alpha = deviceEvent.alpha ? THREE.MathUtils.degToRad(deviceEvent.alpha) : 0;
    const beta = deviceEvent.beta ? THREE.MathUtils.degToRad(deviceEvent.beta) : 0;
    const gamma = deviceEvent.gamma ? THREE.MathUtils.degToRad(deviceEvent.gamma) : 0;
    const orient = THREE.MathUtils.degToRad(screenAngle());
    setDeviceQuaternion(camera.quaternion, alpha, beta, gamma, orient);
  }

  function forward() {
    applyPose();
    camera.updateMatrixWorld();
    return _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }

  function bearing() {
    const f = forward();
    return Math.atan2(f.x, -f.z);
  }

  function pitch() {
    const f = forward();
    return Math.atan2(-f.y, Math.hypot(f.x, f.z));
  }

  function slipperPoint() {
    const f = forward();
    if (f.y > -0.12) return null;
    const distance = -camera.position.y / f.y;
    if (distance < 0.15 || distance > 3.4) return null;
    return {
      x: camera.position.x + f.x * distance,
      z: camera.position.z + f.z * distance
    };
  }

  function placeSlipper(point) {
    if (!point) {
      slipper.visible = false;
      return;
    }
    slipper.visible = true;
    slipper.position.set(point.x, 0, point.z);
    slipper.rotation.y = Math.atan2(point.x, point.z);
  }

  function bugMesh(kind) {
    return kind === 'spider' ? makeSpider() : makeRoach();
  }

  return {
    resize,
    setDesktop(next) {
      desktop = next;
      grid.visible = next;
      renderer.setClearColor(next ? 0x161513 : 0x000000, next ? 1 : 0);
    },
    setMouseLook(next) {
      mouseLook = next;
    },
    hasOrientation: () => seenOrientation,
    setHeight(next) {
      height = next;
    },
    setFov(fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    },
    setSilhouette(next) {
      silhouette = next;
    },
    lookBy(dx, dy) {
      deskBearing += dx;
      deskPitch = Math.min(1.35, Math.max(0.08, deskPitch + dy));
    },
    compassAccuracy: () => compassAccuracy,
    bearing,
    pitch,
    slipperPoint,
    sync({ bugs, paperPoint, held, squashIds, showSlipper }) {
      if (showSlipper) placeSlipper(slipperPoint());
      else slipper.visible = false;
      paper.visible = Boolean(paperPoint) && !held;
      heldPaper.visible = held;
      if (paperPoint) {
        paper.position.set(paperPoint.x, 0, paperPoint.z);
        paper.rotation.y = Math.atan2(paperPoint.x, paperPoint.z);
      }
      const live = new Set();
      for (const bug of bugs) {
        live.add(bug.id);
        let mesh = meshes.get(bug.id);
        if (!mesh) {
          mesh = bugMesh(bug.kind);
          meshes.set(bug.id, mesh);
          scene.add(mesh);
        }
        mesh.position.set(bug.x, 0, bug.z);
        mesh.rotation.y = Math.atan2(bug.x, bug.z);
        const dying = squashIds.has(bug.id) || !bug.alive;
        mesh.userData.squash = dying ? Math.min(1, (mesh.userData.squash || 0) + 0.18) : 0;
        const squash = mesh.userData.squash;
        mesh.scale.set(1 + squash * 0.45, 1 - squash * 0.72, 1 + squash * 0.45);
        for (const solid of mesh.userData.solids) solid.visible = !silhouette;
      }
      for (const [id, mesh] of meshes) {
        if (!live.has(id)) {
          scene.remove(mesh);
          meshes.delete(id);
        }
      }
    },
    render() {
      applyPose();
      renderer.render(scene, camera);
    }
  };
}

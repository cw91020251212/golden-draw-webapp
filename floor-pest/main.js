import { createAudio } from './audio.js';
import {
  LIMITS,
  adjustFov,
  adjustHeight,
  createRound,
  hudSpider,
  isLookingAt,
  marksAreDistinct,
  panAmount,
  positionBearing,
  signedDelta,
  updateRound
} from './logic.js';
import { createView } from './view.js';

const cam = document.querySelector('#cam');
const look = document.querySelector('#look');
const flash = document.querySelector('#flash');
const glass = document.querySelector('#glass');
const climber = document.querySelector('#climber');
const glassText = document.querySelector('#glass-text');
const top = document.querySelector('#top');
const prompt = document.querySelector('#prompt');
const lightButton = document.querySelector('#light');
const debug = document.querySelector('#debug');
const startNote = document.querySelector('#start-note');
const markCopy = document.querySelector('#mark-copy');
const hudRoaches = document.querySelector('#hud-roaches');
const hudSpiderLabel = document.querySelector('#hud-spider');
const hudGlass = document.querySelector('#hud-glass');
const endTitle = document.querySelector('#end-title');
const endCopy = document.querySelector('#end-copy');
const silhouetteInput = document.querySelector('#silhouette');
const silhouetteLive = document.querySelector('#silhouette-live');

const screens = {
  start: document.querySelector('#screen-start'),
  mark: document.querySelector('#screen-mark'),
  fit: document.querySelector('#screen-fit'),
  end: document.querySelector('#screen-end')
};
const playActions = document.querySelector('#play-actions');
const stampButton = document.querySelector('#stamp');
const pickupButton = document.querySelector('#pickup');
const swatButton = document.querySelector('#swat');
const dropButton = document.querySelector('#drop');

const view = createView(document.querySelector('#view'));
const audio = createAudio();
const showDebug = new URLSearchParams(location.search).has('debug');
debug.hidden = !showDebug;

let mode = 'start';
let forceMouse = false;
let height = 1.2;
let fov = 60;
let shadowsOnly = false;
let doorYaw = 0;
let nestYaw = 0;
let round = null;
let stream = null;
let nestIgnoredFor = 0;
let stillFor = 0;
let prevSlip = null;
let soundClock = 0;
let promptOverride = '';
let promptUntil = 0;
const corpses = new Map();

let accel = 0;
let accelAt = 0;
let yawRate = 0;
let yawAt = 0;
const latch = {
  stamp: false,
  swat: false,
  light: false,
  pickup: false,
  flick: false
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askPermission(Ctor, absolute) {
  if (!Ctor || typeof Ctor.requestPermission !== 'function') return;
  try {
    if (absolute) await Ctor.requestPermission(true);
    else await Ctor.requestPermission();
  } catch {
    try {
      await Ctor.requestPermission();
    } catch {
      /* Events may still arrive on Android without a prompt. */
    }
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    cam.srcObject = stream;
    await cam.play();
    return true;
  } catch {
    return false;
  }
}

async function pulseTorch() {
  const track = stream && stream.getVideoTracks()[0];
  const caps = track && track.getCapabilities && track.getCapabilities();
  if (!caps || !caps.torch) return;
  try {
    await track.applyConstraints({ advanced: [{ torch: true }] });
    setTimeout(() => {
      track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }, 400);
  } catch {
    /* The white flash already happened. */
  }
}

function setShadows(next) {
  shadowsOnly = next;
  silhouetteInput.checked = next;
  silhouetteLive.textContent = next ? '見到形' : '只見影';
  view.setSilhouette(next);
}

function show(name) {
  for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
  const playing = name === 'play';
  playActions.hidden = !playing;
  top.hidden = !playing;
  lightButton.hidden = !playing;
  if (name !== 'play') glass.hidden = true;
}

function compassWarning() {
  const accuracy = view.compassAccuracy();
  if (typeof accuracy === 'number' && (accuracy < 0 || accuracy > 25)) {
    return '羅盤唔穩，標完之後唔好重新載入。';
  }
  return '';
}

function currentPrompt() {
  if (promptOverride && performance.now() < promptUntil) return promptOverride;
  const warning = mode === 'door' || mode === 'nest' ? compassWarning() : '';
  const dragging = forceMouse || !view.hasOrientation();
  if (mode === 'door') {
    const how = dragging ? '拖曳畫面轉身，望住你當係門口嘅方向，然後標低。' : '企定。望住門口，然後標低呢個方向。';
    return `${how}${warning}`;
  }
  if (mode === 'nest') {
    const how = dragging ? '再拖去另一個方向，當係最暗嘅角。' : '轉身望住最暗嘅角，再標一次。兩個方向要分得開。';
    return `${how}${warning}`;
  }
  if (mode !== 'play' || !round || round.outcome || round.climbingId) return '';
  if (round.phase === 'first' && round.time < 20) {
    return dragging
      ? '拖曳可以轉身同低頭。對準曱甴，停一停，撳「踩」或者空白鍵。'
      : '低頭，拖鞋對準曱甴。停一停，向地下篤，或者撳「踩」。';
  }
  if (round.spiderSince != null && round.time - round.spiderSince < 8 && round.spider && round.spider.alive) {
    return '門口有聲。你唔望住隻蜘蛛，佢先至行。地上有張報紙。';
  }
  return '';
}

function findBug(id) {
  if (!round) return null;
  if (round.spider && round.spider.id === id) return round.spider;
  return round.roaches.find((roach) => roach.id === id) || null;
}

function visibleBugs() {
  const now = performance.now();
  for (const [id, corpse] of corpses) {
    if (corpse.until < now) corpses.delete(id);
  }
  const living = round.roaches.filter((roach) => roach.alive);
  if (round.spider && round.spider.alive) living.push(round.spider);
  return living.concat([...corpses.values()]);
}

function finish(title, copy) {
  mode = 'end';
  endTitle.textContent = title;
  endCopy.textContent = copy;
  glass.hidden = true;
  show('end');
}

function handle(event) {
  if (event.type === 'dead') {
    const bug = findBug(event.id);
    if (bug) corpses.set(event.id, { ...bug, alive: false, until: performance.now() + 420 });
    audio.crunch();
    if (navigator.vibrate) navigator.vibrate(40);
  } else if (event.type === 'hurt') {
    audio.hurt();
    if (navigator.vibrate) navigator.vibrate(20);
  } else if (event.type === 'swat') {
    audio.swat();
  } else if (event.type === 'glass') {
    audio.glass();
    if (round.outcome !== 'lose') {
      climber.className = event.kind === 'spider' ? 'bug-body spider' : 'bug-body';
      glassText.textContent = event.kind === 'spider' ? '蜘蛛上咗塊玻璃' : '曱甴上咗塊玻璃';
      glass.hidden = false;
    }
  } else if (event.type === 'flick') {
    glass.hidden = true;
  } else if (event.type === 'light') {
    audio.flash();
    flash.classList.add('on');
    setTimeout(() => flash.classList.remove('on'), 80);
    pulseTorch();
  } else if (event.type === 'lose') {
    finish('佢哋上到身', '兩隻爬上咗塊玻璃。企定再嚟過。');
  } else if (event.type === 'win') {
    finish('清咗', '暗角同門口都靜晒。');
  }
}

function soundTick(dt, viewBearing) {
  if (!round || round.outcome || round.climbingId) return;
  soundClock += dt;
  if (soundClock < 0.22) return;
  soundClock = 0;
  const roach = round.roaches.find((bug) => bug.alive && bug.mode !== 'glass' && !isLookingAt(viewBearing, view.pitch(), bug.x, bug.z));
  if (roach) audio.skitter(panAmount(viewBearing, positionBearing(roach.x, roach.z)));
  if (round.spider && round.spider.alive && round.spider.mode === 'run') {
    audio.step(panAmount(viewBearing, positionBearing(round.spider.x, round.spider.z)));
  }
}

function updateChrome(slipper) {
  prompt.textContent = currentPrompt();
  if (mode === 'door') markCopy.textContent = '門口喺邊？';
  if (mode === 'nest') markCopy.textContent = '最暗嘅角喺邊？';
  const playing = mode === 'play' && round && !round.outcome;
  if (playing) {
    const alive = round.roaches.filter((roach) => roach.alive).length;
    hudRoaches.textContent = `曱甴 ${alive}`;
    hudSpiderLabel.textContent = hudSpider(round);
    hudGlass.textContent = `玻璃 ${round.glass}/2`;
    lightButton.disabled = round.time < round.lightReadyAt;
    const blocked = Boolean(round.climbingId);
    const nearPaper = slipper && Math.hypot(slipper.x - round.paper.x, slipper.z - round.paper.z) < 0.22;
    stampButton.hidden = blocked || !slipper;
    pickupButton.hidden = blocked || round.held || !nearPaper;
    swatButton.hidden = blocked || !round.held || !slipper;
    dropButton.hidden = swatButton.hidden;
    show('play');
  }
  if (showDebug) {
    const bearing = view.bearing();
    debug.hidden = false;
    debug.textContent = `俯角 ${(view.pitch() * 180 / Math.PI).toFixed(0)}°  方向 ${(bearing * 180 / Math.PI).toFixed(0)}°  高度 ${(height * 100).toFixed(0)}cm`;
  }
}

function begin(useMouse) {
  forceMouse = useMouse;
  const mouse = useMouse || !view.hasOrientation();
  view.setMouseLook(mouse);
  view.setDesktop(useMouse);
  cam.hidden = useMouse;
  look.hidden = false;
  look.style.pointerEvents = mouse ? 'auto' : 'none';
  mode = 'door';
  show('mark');
}

let bootToken = 0;

function stopCamera() {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
  stream = null;
  cam.srcObject = null;
}

async function boot(useMouse) {
  const token = ++bootToken;
  await audio.resume();
  if (token !== bootToken) return;
  if (useMouse) {
    stopCamera();
    begin(true);
    return;
  }
  const opened = await startCamera();
  if (token !== bootToken) {
    if (opened) stopCamera();
    return;
  }
  if (!opened) {
    startNote.textContent = '開唔到後鏡頭。可以改用滑鼠彩排。';
    return;
  }
  await delay(500);
  if (token !== bootToken) {
    stopCamera();
    return;
  }
  // Keep the camera up. Drag is the stand-in until a direction event arrives,
  // and that later event can still take over because this is not rehearsal.
  begin(false);
}

document.querySelector('#start').addEventListener('click', async () => {
  const button = document.querySelector('#start');
  button.disabled = true;
  await askPermission(window.DeviceOrientationEvent, true);
  await askPermission(window.DeviceMotionEvent, false);
  try {
    await boot(false);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#rehearse').addEventListener('click', () => boot(true));

document.querySelector('#mark').addEventListener('click', () => {
  const bearing = view.bearing();
  if (mode === 'door') {
    doorYaw = bearing;
    mode = 'nest';
    return;
  }
  if (mode === 'nest') {
    if (!marksAreDistinct(doorYaw, bearing)) {
      promptOverride = '兩個方向太近。再轉身，望住另一個角。';
      promptUntil = performance.now() + 2200;
      return;
    }
    nestYaw = bearing;
    mode = 'fit';
    show('fit');
  }
});

document.querySelector('#closer').addEventListener('click', () => {
  height = adjustHeight(height, true);
  view.setHeight(height);
});
document.querySelector('#farther').addEventListener('click', () => {
  height = adjustHeight(height, false);
  view.setHeight(height);
});
document.querySelector('#wider').addEventListener('click', () => {
  fov = adjustFov(fov, true);
  view.setFov(fov);
});
document.querySelector('#narrower').addEventListener('click', () => {
  fov = adjustFov(fov, false);
  view.setFov(fov);
});
document.querySelector('#fit-ok').addEventListener('click', () => {
  if (mode !== 'fit') return;
  corpses.clear();
  round = createRound(doorYaw, nestYaw);
  nestIgnoredFor = 0;
  stillFor = 0;
  prevSlip = null;
  mode = 'play';
  show('play');
});

stampButton.addEventListener('click', () => {
  latch.stamp = true;
});
pickupButton.addEventListener('click', () => {
  latch.pickup = true;
});
dropButton.addEventListener('click', () => {
  latch.pickup = true;
});
swatButton.addEventListener('click', () => {
  latch.swat = true;
});
lightButton.addEventListener('click', () => {
  latch.light = true;
});
document.querySelector('#flick').addEventListener('click', () => {
  latch.flick = true;
});
document.querySelector('#replay').addEventListener('click', () => {
  corpses.clear();
  round = createRound(doorYaw, nestYaw);
  nestIgnoredFor = 0;
  stillFor = 0;
  mode = 'play';
  show('play');
});
document.querySelector('#remark').addEventListener('click', () => {
  round = null;
  corpses.clear();
  mode = 'door';
  show('mark');
});

silhouetteInput.addEventListener('change', () => setShadows(silhouetteInput.checked));
silhouetteLive.addEventListener('click', () => setShadows(!shadowsOnly));

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Space') {
    event.preventDefault();
    latch.stamp = true;
  } else if (event.code === 'KeyF') latch.light = true;
  else if (event.code === 'KeyE') latch.pickup = true;
  else if (event.code === 'KeyQ') latch.swat = true;
});

window.addEventListener('devicemotion', (event) => {
  const reading = event.acceleration;
  if (reading && reading.x != null) {
    accel = Math.hypot(reading.x, reading.y, reading.z);
    accelAt = performance.now();
  }
  const rate = event.rotationRate;
  if (rate && rate.alpha != null) {
    yawRate = Math.hypot(rate.alpha, rate.beta, rate.gamma);
    yawAt = performance.now();
  }
});

let dragX = 0;
let dragY = 0;
let dragging = false;
look.addEventListener('pointerdown', (event) => {
  dragging = true;
  dragX = event.clientX;
  dragY = event.clientY;
  look.setPointerCapture(event.pointerId);
});
look.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const dx = event.clientX - dragX;
  const dy = event.clientY - dragY;
  dragX = event.clientX;
  dragY = event.clientY;
  view.lookBy(dx * 0.005, dy * 0.005);
  if (round && round.held && Math.abs(dx) > 48) latch.swat = true;
});
look.addEventListener('pointerup', () => {
  dragging = false;
});

window.addEventListener('resize', () => view.resize());
view.resize();
view.setHeight(height);
view.setFov(fov);
show('start');

let last = 0;
function frame(now) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  if (!forceMouse && view.hasOrientation()) {
    view.setMouseLook(false);
    cam.hidden = false;
    look.style.pointerEvents = 'none';
  }
  const viewBearing = view.bearing();
  const viewPitch = view.pitch();
  const slipper = view.slipperPoint();
  if (mode === 'play' && round && !round.outcome) {
    if (Math.abs(signedDelta(viewBearing, round.nestYaw)) > LIMITS.nestIgnoreAngle) nestIgnoredFor += dt;
    else nestIgnoredFor = 0;
    const freshAccel = now - accelAt < 140 ? accel : 0;
    const freshYaw = now - yawAt < 90 ? yawRate : 0;
    const events = updateRound(round, dt, {
      viewYaw: viewBearing,
      pitch: viewPitch,
      slipper,
      stillFor,
      accel: freshAccel,
      yawRate: freshYaw,
      stampPressed: latch.stamp,
      swatPressed: latch.swat,
      lightPressed: latch.light,
      pickupPressed: latch.pickup,
      flickPressed: latch.flick,
      nestIgnoredFor
    });
    for (const event of events) handle(event);
    soundTick(dt, viewBearing);
  }
  if (!slipper || !prevSlip) stillFor = 0;
  else {
    const speed = Math.hypot(slipper.x - prevSlip.x, slipper.z - prevSlip.z) / Math.max(dt, 0.001);
    stillFor = speed < 0.8 ? stillFor + dt : 0;
  }
  prevSlip = slipper;
  latch.stamp = false;
  latch.swat = false;
  latch.light = false;
  latch.pickup = false;
  latch.flick = false;

  updateChrome(slipper);
  document.body.classList.toggle('playing', mode === 'play');
  const inRound = round && (mode === 'play' || mode === 'end');
  view.sync({
    bugs: inRound ? visibleBugs() : [],
    paperPoint: inRound ? round.paper : null,
    held: Boolean(round && round.held),
    squashIds: new Set(corpses.keys()),
    showSlipper: mode !== 'start'
  });
  if (showDebug) {
    window.__floor = {
      get round() { return round; },
      bearing: () => view.bearing(),
      pitch: () => view.pitch(),
      lookBy: (yaw, pitch) => view.lookBy(yaw, pitch)
    };
  }
  view.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

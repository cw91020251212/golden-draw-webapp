// End-of-rehearsal celebration over the finished draw. Fireworks stay gold in
// the air. Balloons and falling scraps are a mixed festival palette. Audio is
// synthesized in the page's AudioContext and mixed on top of the soundtrack:
// boom and crackle only, plus applause and unpitched cheers for about a minute.
// No whistles, glides, or beeps.
export const CELEBRATION_HEADING = '恭喜你中頭獎';

const GOLD = ['#fff6d4', '#ffe7a4', '#f8dc8a', '#e8c36a', '#d7a441', '#c4a15a', '#a98442', '#8a6424', '#f4f1e9'];

export const BALLOON_PAIRS = [
  { family: 'red', color: '#e23b3b', shade: '#8c1515', gloss: '#ffd2cc' },
  { family: 'gold', color: '#f0c14a', shade: '#a67a16', gloss: '#fff3c4' },
  { family: 'purple', color: '#8b45c6', shade: '#4d1c7a', gloss: '#f3e0ff' },
  { family: 'blue', color: '#3a78dc', shade: '#163e8c', gloss: '#d9e7ff' },
  { family: 'green', color: '#2f9d58', shade: '#146338', gloss: '#d7ffe6' },
  { family: 'cream', color: '#fff8ec', shade: '#c8b28a', gloss: '#ffffff' },
  { family: 'orange', color: '#f0892c', shade: '#a64c0e', gloss: '#ffe3c4' },
  { family: 'pink', color: '#e45698', shade: '#8c2458', gloss: '#ffd6ea' }
];

export const CONFETTI_COLORS = [
  { family: 'red', color: '#e23b3b' },
  { family: 'gold', color: '#f0c14a' },
  { family: 'purple', color: '#8b45c6' },
  { family: 'cream', color: '#fff6e4' },
  { family: 'pink', color: '#f07aaa' },
  { family: 'green', color: '#3caf6a' },
  { family: 'blue', color: '#5aa0e6' },
  { family: 'orange', color: '#f0892c' }
];

const DEBRIS_SWATCHES = [
  { family: 'red', color: '#d12e2a', kind: 'paper' },
  { family: 'red', color: '#a31b22', kind: 'paper' },
  { family: 'purple', color: '#7a349e', kind: 'paper' },
  { family: 'purple', color: '#54206e', kind: 'paper' },
  { family: 'gold', color: '#e2b14a', kind: 'paper' },
  { family: 'gold', color: '#f3d78a', kind: 'paper' },
  { family: 'red', color: '#c4232a', kind: 'powder' },
  { family: 'red', color: '#e25848', kind: 'powder' }
];

const BURST_KINDS = ['peony', 'willow', 'crown', 'peony', 'peony', 'willow', 'crown', 'peony'];
const BURST_X = [0.18, 0.82, 0.48, 0.3, 0.7, 0.14, 0.86, 0.4, 0.6, 0.24, 0.76, 0.52];
const BURST_Y = [0.22, 0.18, 0.16, 0.28, 0.24, 0.2, 0.26, 0.17, 0.23, 0.29, 0.21, 0.15];

function buildBursts(until) {
  const bursts = [];
  const gap = 1.32;
  for (let i = 0; ; i++) {
    const t = Math.round((0.16 + i * gap) * 100) / 100;
    if (t > until) break;
    bursts.push({
      t,
      x: BURST_X[i % BURST_X.length],
      y: BURST_Y[i % BURST_Y.length],
      power: 0.78 + (i % 5) * 0.08,
      kind: BURST_KINDS[i % BURST_KINDS.length]
    });
  }
  return bursts;
}

export function celebrationPlan(reduced) {
  if (reduced) {
    return {
      heading: CELEBRATION_HEADING,
      reduced: true,
      applauseSeconds: 12,
      fadeSeconds: 3.2,
      showSeconds: 12,
      launchLead: 0,
      bursts: [
        { t: 0.2, x: 0.32, y: 0.28, power: 0.8, kind: 'still' },
        { t: 1.6, x: 0.68, y: 0.24, power: 0.75, kind: 'still' },
        { t: 3.1, x: 0.5, y: 0.2, power: 0.85, kind: 'still' },
        { t: 4.8, x: 0.28, y: 0.3, power: 0.7, kind: 'still' },
        { t: 6.6, x: 0.74, y: 0.22, power: 0.8, kind: 'still' }
      ],
      balloonCount: 8,
      confettiPerSecond: 8,
      confettiFor: 12,
      confettiCap: 90,
      encoreUntil: 12,
      debrisCap: 110
    };
  }
  return {
    heading: CELEBRATION_HEADING,
    reduced: false,
    applauseSeconds: 68,
    fadeSeconds: 8,
    showSeconds: 68,
    launchLead: 0.48,
    bursts: buildBursts(62.4),
    balloonCount: 12,
    confettiPerSecond: 16,
    confettiFor: 68,
    confettiCap: 260,
    encoreUntil: 68,
    debrisCap: 440
  };
}

const SHELL = {
  peony: { tail: 1.05, crackle: 160, spread: 1.45, boom: 1 },
  willow: { tail: 1.55, crackle: 120, spread: 0.8, boom: 0.9 },
  crown: { tail: 1.15, crackle: 220, spread: 1.4, boom: 1.08 },
  still: { tail: 0.8, crackle: 90, spread: 1.2, boom: 0.8 }
};

function panGains(pan) {
  const angle = Math.min(1, Math.max(0, pan)) * Math.PI / 2;
  return [Math.cos(angle), Math.sin(angle)];
}

function addPanned(left, right, index, sample, gainL, gainR) {
  if (index < 0 || index >= left.length || sample === 0) return;
  left[index] += sample * gainL;
  right[index] += sample * gainR;
}

function fadeEdges(left, right, sampleRate, fadeInSeconds, fadeOutSeconds) {
  const inn = Math.min(left.length, Math.floor(sampleRate * fadeInSeconds));
  for (let i = 0; i < inn; i++) {
    const g = inn <= 1 ? 1 : i / inn;
    left[i] *= g;
    right[i] *= g;
  }
  const out = Math.min(left.length, Math.floor(sampleRate * fadeOutSeconds));
  const start = left.length - out;
  for (let i = 0; i < out; i++) {
    const u = out <= 1 ? 1 : i / (out - 1);
    const g = Math.pow(1 - u, 1.35);
    left[start + i] *= g;
    right[start + i] *= g;
  }
}

function softenAndNormalize(left, right, target) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    const l = left[i];
    const r = right[i];
    const al = l < 0 ? -l : l;
    const ar = r < 0 ? -r : r;
    if (al > peak) peak = al;
    if (ar > peak) peak = ar;
  }
  const gain = peak > 0.0001 ? target / peak : 1;
  if (gain !== 1) {
    for (let i = 0; i < left.length; i++) {
      left[i] *= gain;
      right[i] *= gain;
    }
  }
  return peak * gain;
}

function bandpass(freq, q, sampleRate) {
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha) / a0,
    x1: 0, x2: 0, y1: 0, y2: 0,
    process(x) {
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;
      return y;
    }
  };
}

// Aerial shell made only of noise: a low rumble, a short bright report, then
// crackle. No oscillators, so there is no whistle, falling tone, or beep.
function writeBoom(left, right, sampleRate, startSec, power, pan, random, shell) {
  const tail = shell.tail;
  const n = Math.floor(sampleRate * tail);
  const start = Math.floor(startSec * sampleRate);
  let rumble = 0;
  let body = 0;
  let hp = 0;
  let prev = 0;
  const weight = 0.9 * power * shell.boom;
  const hpA = Math.exp(-2 * Math.PI * 30 / sampleRate);
  const rumbleA = 1 - Math.exp(-2 * Math.PI * 110 / sampleRate);
  const nyquist = sampleRate * 0.45;
  const thudDecay = Math.exp(-1 / (0.2 * sampleRate));
  const reportDecay = Math.exp(-1 / (0.07 * sampleRate));
  const crackDecay = Math.exp(-1 / (0.01 * sampleRate));
  const crackSamples = Math.floor(sampleRate * 0.035);
  let thudEnv = 1;
  let reportEnv = 1;
  let crackEnv = 1;
  let bodyA = 0;
  const [boomL, boomR] = panGains(pan);
  for (let i = 0; i < n; i++) {
    if ((i & 31) === 0) {
      const cutoff = 90 + 1800 * Math.exp(-(i / sampleRate) / 0.045);
      bodyA = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, nyquist) / sampleRate);
    }
    const white = random() * 2 - 1;
    hp = hpA * (hp + white - prev);
    prev = white;
    rumble += rumbleA * (hp - rumble);
    body += bodyA * (hp - body);
    const crack = i < crackSamples ? (white - body) * crackEnv * 0.16 : 0;
    addPanned(left, right, start + i, (rumble * thudEnv * 1.35 + body * reportEnv * 0.55 + crack) * weight, boomL, boomR);
    thudEnv *= thudDecay;
    reportEnv *= reportDecay;
    crackEnv *= crackDecay;
  }
  const sparks = Math.max(12, Math.round(shell.crackle * power));
  for (let s = 0; s < sparks; s++) {
    const u = Math.pow(random(), shell.spread);
    const loud = random() < 0.22;
    const mid = loud || random() < 0.4;
    const t0 = 0.05 + u * Math.max(0.08, tail - 0.1);
    const dur = mid ? 0.009 + random() * 0.014 : 0.0014 + random() * 0.0032;
    const amp = (loud ? 0.85 + random() * 0.7 : 0.1 + random() * 0.32) * Math.exp(-u * 0.95) * power * (mid ? 0.9 : 0.62);
    const grains = Math.max(2, Math.floor(sampleRate * dur));
    const i0 = start + Math.floor(t0 * sampleRate);
    const cutoff = mid ? 1300 + random() * 1900 : 4200 + random() * 1800;
    const a = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, sampleRate * 0.45) / sampleRate);
    let state = 0;
    const [sparkL, sparkR] = panGains(pan + (random() - 0.5) * 0.42);
    for (let k = 0; k < grains; k++) {
      const env = Math.sin(Math.PI * (k + 0.5) / grains);
      const white = random() * 2 - 1;
      state += a * (white - state);
      const bright = mid ? state : white - state;
      addPanned(left, right, i0 + k, bright * env * amp, sparkL, sparkR);
    }
  }
}

export function fireworkCues(plan) {
  const lead = plan.launchLead || 0;
  const calm = !!plan.reduced;
  const cues = [];
  for (const burst of plan.bursts) {
    const shell = SHELL[burst.kind] || SHELL.peony;
    const scale = calm ? 0.62 : 1;
    cues.push({
      t: burst.t + lead,
      type: 'boom',
      pan: burst.x,
      power: burst.power,
      tail: shell.tail * (calm ? 0.8 : 1),
      crackle: Math.round(shell.crackle * scale),
      spread: shell.spread,
      boom: shell.boom,
      crown: burst.kind === 'crown' && !calm
    });
  }
  const withCrown = [];
  for (const cue of cues) {
    withCrown.push(cue);
    if (cue.type === 'boom' && cue.crown) {
      withCrown.push({
        ...cue,
        t: cue.t + 0.18,
        power: cue.power * 0.58,
        tail: cue.tail * 0.62,
        crackle: Math.round(cue.crackle * 0.5),
        crown: false
      });
    }
  }
  return withCrown;
}

export function synthesizeFireworkLayer(sampleRate, seconds, cues, random = Math.random) {
  const total = Math.max(1, Math.floor(sampleRate * seconds));
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  for (const cue of cues) writeBoom(left, right, sampleRate, cue.t, cue.power, cue.pan, random, cue);
  fadeEdges(left, right, sampleRate, 0.012, 0.4);
  const peak = softenAndNormalize(left, right, 0.9);
  return { left, right, peak };
}

// A cheer is a swell of colored noise, like a group shouting, with no pitch.
const CHEER_BANDS = [
  [420, 980],
  [520, 1400],
  [360, 860]
];

function writeCheer(left, right, sampleRate, startSec, random) {
  const bands = CHEER_BANDS[Math.floor(random() * CHEER_BANDS.length)];
  const dur = 0.55 + random() * 0.5;
  const n = Math.floor(sampleRate * dur);
  const start = Math.floor(startSec * sampleRate);
  const low = bandpass(bands[0], 1.4, sampleRate);
  const high = bandpass(bands[1], 1.15, sampleRate);
  const [cheerL, cheerR] = panGains(0.22 + random() * 0.56);
  const amp = 0.42 + random() * 0.2;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const env = Math.sin(Math.min(1, u / 0.22) * Math.PI * 0.5) * Math.pow(1 - u, 0.7);
    const white = random() * 2 - 1;
    const shout = low.process(white) * 0.85 + high.process(white) * 0.45;
    addPanned(left, right, start + i, shout * env * amp, cheerL, cheerR);
  }
}

// Dense overlapping claps plus unpitched cheer swells. The bed stays continuous
// so it reads as a crowd, not as separate pops or beeps.
export function synthesizeCrowd(sampleRate, seconds, fadeSeconds, random = Math.random) {
  const total = Math.max(1, Math.floor(sampleRate * seconds));
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const claps = Math.max(24, Math.floor(seconds * 92));
  for (let c = 0; c < claps; c++) {
    const place = (c + random() * 0.9) / claps;
    const start = Math.min(total - 2, Math.floor(place * total));
    const dur = Math.max(2, Math.floor(sampleRate * (0.011 + random() * 0.026)));
    const amp = 0.28 + random() * 0.72;
    const [clapL, clapR] = panGains(random());
    const cut = 850 + random() * 2400;
    const a = 1 - Math.exp(-2 * Math.PI * Math.min(cut, sampleRate * 0.45) / sampleRate);
    const envDecay = Math.exp(-3.1 / dur);
    const attackSamples = Math.max(1, Math.floor(dur * 0.14));
    let env = 1;
    let lp = 0;
    const limit = Math.min(total, start + dur);
    for (let i = start; i < limit; i++) {
      const k = i - start;
      const attack = k < attackSamples ? Math.sin((k / attackSamples) * Math.PI * 0.5) : 1;
      const white = random() * 2 - 1;
      lp += a * (white - lp);
      const sample = (lp * 0.82 + (white - lp) * 0.38) * attack * env * amp;
      left[i] += sample * clapL;
      right[i] += sample * clapR;
      env *= envDecay;
    }
  }
  let murmurL = 0;
  let murmurR = 0;
  let walk = 0.55;
  const wobbleStep = 2 * Math.PI * 0.27 / sampleRate;
  let wobblePhase = 0;
  for (let i = 0; i < total; i++) {
    walk += (random() - 0.5) * 0.0016;
    if (walk > 0.95) walk = 0.95;
    else if (walk < 0.28) walk = 0.28;
    const whiteL = random() * 2 - 1;
    const whiteR = random() * 2 - 1;
    murmurL = murmurL * 0.93 + whiteL * 0.07;
    murmurR = murmurR * 0.93 + whiteR * 0.07;
    const wobble = 0.9 + 0.1 * Math.sin(wobblePhase);
    wobblePhase += wobbleStep;
    const bed = walk * 0.2 * wobble;
    left[i] += murmurL * bed;
    right[i] += murmurR * (1.05 - walk) * 0.2 * wobble;
  }
  const cheerTimes = [];
  const slots = Math.max(3, Math.round(seconds * 0.85));
  const span = Math.max(0.4, seconds - Math.min(fadeSeconds, seconds * 0.45) - 0.45);
  for (let c = 0; c < slots; c++) {
    const start = 0.32 + ((c + random() * 0.55) / slots) * span;
    cheerTimes.push(start);
    writeCheer(left, right, sampleRate, start, random);
  }
  fadeEdges(left, right, sampleRate, 0.18, fadeSeconds);
  const peak = softenAndNormalize(left, right, 0.88);
  return { left, right, peak, cheerTimes };
}

function playBuffer(audioContext, rendered, destination, when, sampleRate) {
  const buffer = audioContext.createBuffer(2, rendered.left.length, sampleRate);
  buffer.copyToChannel(rendered.left, 0);
  buffer.copyToChannel(rendered.right, 1);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  source.start(when);
  source.onended = () => { try { source.disconnect(); } catch { /* already torn down */ } };
  return source;
}

// Sits on audioContext.destination. Does not pause, duck, or replace the
// HTML soundtrack (Gilded Winter Gala plays on its own element).
export function playCelebrationAudio(audioContext, plan, random = Math.random) {
  if (!audioContext || typeof audioContext.createBuffer !== 'function') return { stop() {}, started: false, reason: 'unavailable', cues: [] };
  const seconds = plan.applauseSeconds;
  const cues = fireworkCues(plan);
  const calm = !!plan.reduced;
  // 16 kHz keeps the boom, crackle, and crowd intact and lets the minute-long
  // bed build without freezing the winning moment. The context resamples it.
  const sampleRate = Math.min(audioContext.sampleRate || 16000, 16000);
  const crowd = synthesizeCrowd(sampleRate, seconds, plan.fadeSeconds, random);
  const fireworks = synthesizeFireworkLayer(sampleRate, seconds, cues, random);
  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(calm ? 0.72 : 1, now);
  master.connect(audioContext.destination);
  const crowdGain = audioContext.createGain();
  crowdGain.gain.setValueAtTime(calm ? 0.2 : 0.36, now);
  crowdGain.connect(master);
  const fireGain = audioContext.createGain();
  fireGain.gain.setValueAtTime(calm ? 0.24 : 0.48, now);
  fireGain.connect(master);
  const sources = [
    playBuffer(audioContext, crowd, crowdGain, now, sampleRate),
    playBuffer(audioContext, fireworks, fireGain, now, sampleRate)
  ];
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const t = audioContext.currentTime;
    try {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.001, master.gain.value), t);
      master.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      for (const source of sources) {
        try { source.stop(t + 0.48); } catch { /* already ended */ }
      }
    } catch { /* already stopped */ }
  };
  return { stop, started: true, reason: 'playing', cues };
}

function spawnBurst(world, x, y, power, kind) {
  const willow = kind === 'willow';
  const count = Math.round((kind === 'still' ? 42 : willow ? 54 : 72) * power * (world.narrow ? 0.7 : 1));
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (world.random() - 0.5) * 0.18;
    const ring = kind === 'crown' && i % 3 === 0 ? 0.62 : kind === 'still' ? 0.75 + (i % 4) * 0.08 : 0.45 + world.random() * 0.7;
    const speed = (kind === 'still' ? 86 : 150 + world.random() * 230) * power * ring;
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * (willow ? 0.72 : 1),
      age: 0,
      life: kind === 'still' ? 1.35 : willow ? 1.7 + world.random() * 0.5 : 1.05 + world.random() * 0.55,
      size: kind === 'still' ? 3.1 : 2.3 + world.random() * 2.1,
      color: GOLD[i % GOLD.length],
      gravity: kind === 'still' ? 18 : willow ? 46 : 28,
      drag: willow ? 0.55 : 0.72,
      twinkle: world.random() * Math.PI * 2,
      trail: []
    });
  }
}

function makeSpecks(random) {
  const specks = [];
  const count = 6 + Math.floor(random() * 4);
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const dist = random() * 12;
    specks.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.62, r: 1.2 + random() * 2.1 });
  }
  return specks;
}

function spawnFallingDebris(world, x, y, power, kind) {
  const count = Math.round((kind === 'still' ? 18 : 26) * Math.max(0.55, power));
  for (let i = 0; i < count; i++) {
    if (world.debris.length >= world.plan.debrisCap) return;
    const swatch = DEBRIS_SWATCHES[(world.nextDebrisId + i) % DEBRIS_SWATCHES.length];
    const angle = world.random() * Math.PI * 2;
    const speed = 70 + world.random() * 160;
    world.debris.push({
      id: world.nextDebrisId++,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.55 - 36,
      rot: world.random() * Math.PI * 2,
      vr: (world.random() - 0.5) * 7,
      w: swatch.kind === 'powder' ? 18 + world.random() * 16 : 8 + world.random() * 11,
      h: swatch.kind === 'powder' ? 9 + world.random() * 7 : 3.5 + world.random() * 5.5,
      color: swatch.color,
      family: swatch.family,
      kind: swatch.kind,
      alpha: swatch.kind === 'powder' ? 0.4 + world.random() * 0.22 : 0.9,
      settled: false,
      settleU: 0.72 + world.random() * 0.24,
      specks: swatch.kind === 'powder' ? makeSpecks(world.random) : null
    });
  }
}

function explode(world, x, y, power, kind, t) {
  spawnBurst(world, x, y, power, kind);
  spawnFallingDebris(world, x, y, power, kind);
  world.flashes.push({ x, y, age: 0, life: kind === 'still' ? 0.7 : 0.38, radius: (kind === 'crown' ? 74 : 52) * power });
  if (kind === 'crown') world.pending.push({ at: t + 0.18, x, y, power: power * 0.55, kind: 'peony' });
}

function spawnConfettiPiece(world, y) {
  const swatch = CONFETTI_COLORS[world.confettiBorn % CONFETTI_COLORS.length];
  const shape = world.confettiBorn % 3 === 0 ? 'scrap' : 'petal';
  world.confettiBorn += 1;
  world.confetti.push({
    x: world.random() * world.width,
    y,
    w: 6 + world.random() * 8,
    h: 9 + world.random() * 9,
    vy: (world.plan.reduced ? 26 : 36) + world.random() * (world.plan.reduced ? 18 : 34),
    vx: (world.random() - 0.5) * 14,
    rot: world.random() * Math.PI,
    vr: (world.random() - 0.5) * 1.5,
    sway: world.random() * Math.PI * 2,
    swaySpeed: 0.65 + world.random() * 0.9,
    shape,
    color: swatch.color,
    family: swatch.family
  });
}

export function createCelebrationWorld(plan, width, height, random = Math.random) {
  const world = {
    plan,
    width,
    height,
    narrow: width < 760,
    random,
    particles: [],
    rockets: [],
    balloons: [],
    confetti: [],
    flashes: [],
    debris: [],
    pending: [],
    launched: new Set(),
    confettiDebt: 0,
    confettiBorn: 0,
    confettiFalls: 0,
    nextDebrisId: 1
  };
  for (let i = 0; i < plan.balloonCount; i++) {
    const pair = BALLOON_PAIRS[i % BALLOON_PAIRS.length];
    const sideLeft = i % 2 === 0;
    const slot = Math.floor(i / 2);
    const lane = slot % 3;
    const row = Math.floor(slot / 3);
    world.balloons.push({
      x: width * (sideLeft ? 0.07 + lane * 0.09 : 0.93 - lane * 0.09),
      y: height * (0.4 + row * 0.2 + (lane % 2) * 0.07),
      r: (world.narrow ? 16 : 22) + (i % 4) * 4,
      vy: plan.reduced ? 16 + (i % 4) * 4 : 40 + (i % 5) * 8,
      sway: random() * Math.PI * 2,
      swaySpeed: 0.75 + (i % 5) * 0.16,
      color: pair.color,
      shade: pair.shade,
      gloss: pair.gloss,
      family: pair.family
    });
  }
  return world;
}

export function stepCelebration(world, dt, t) {
  const { plan } = world;
  const width = world.width;
  const height = world.height;
  for (let i = world.pending.length - 1; i >= 0; i--) {
    const item = world.pending[i];
    if (t < item.at) continue;
    world.pending.splice(i, 1);
    explode(world, item.x, item.y, item.power, item.kind, t);
  }
  plan.bursts.forEach((burst, index) => {
    if (world.launched.has(index) || t < burst.t) return;
    world.launched.add(index);
    const x = burst.x * width;
    const y = burst.y * height;
    if (plan.reduced || burst.kind === 'still') explode(world, x, y, burst.power, 'still', t);
    else world.rockets.push({
      x: x + (world.random() - 0.5) * 24,
      y: height + 8,
      tx: x,
      ty: y,
      age: 0,
      dur: Math.max(0.05, plan.launchLead),
      power: burst.power,
      kind: burst.kind,
      trail: []
    });
  });
  if (t < plan.confettiFor) {
    world.confettiDebt += plan.confettiPerSecond * dt;
    while (world.confettiDebt >= 1 && world.confetti.length < plan.confettiCap) {
      world.confettiDebt -= 1;
      spawnConfettiPiece(world, -12 - world.random() * 48);
    }
    if (world.confetti.length >= plan.confettiCap) world.confettiDebt = Math.min(world.confettiDebt, 2);
  }
  for (let i = world.rockets.length - 1; i >= 0; i--) {
    const rocket = world.rockets[i];
    rocket.age += dt;
    const u = Math.min(1, rocket.age / rocket.dur);
    const eased = 1 - Math.pow(1 - u, 2);
    const x = rocket.x + (rocket.tx - rocket.x) * eased;
    const y = rocket.y + (rocket.ty - rocket.y) * eased;
    rocket.trail.push({ x, y });
    if (rocket.trail.length > 4) rocket.trail.shift();
    rocket.px = x;
    rocket.py = y;
    if (u >= 1) {
      explode(world, rocket.tx, rocket.ty, rocket.power, rocket.kind, t);
      world.rockets.splice(i, 1);
    }
  }
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.age += dt;
    if (p.age >= p.life) { world.particles.splice(i, 1); continue; }
    p.vx *= Math.exp(-p.drag * dt);
    p.vy = p.vy * Math.exp(-p.drag * dt) + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();
  }
  for (let i = world.flashes.length - 1; i >= 0; i--) {
    world.flashes[i].age += dt;
    if (world.flashes[i].age >= world.flashes[i].life) world.flashes.splice(i, 1);
  }
  for (const bit of world.debris) {
    if (bit.settled) {
      bit.y = height * bit.settleU;
      bit.x = Math.min(width - 8, Math.max(8, bit.x));
      continue;
    }
    bit.vx *= Math.exp(-0.7 * dt);
    bit.vy += 560 * dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.rot += bit.vr * dt;
    const floor = height * bit.settleU;
    if (bit.y >= floor && bit.vy > 0) {
      bit.y = floor;
      bit.x = Math.min(width - 8, Math.max(8, bit.x));
      bit.vx = 0;
      bit.vy = 0;
      bit.vr = 0;
      bit.settled = true;
    }
  }
  const drift = plan.reduced ? 10 : 26;
  for (const balloon of world.balloons) {
    balloon.y -= balloon.vy * dt;
    balloon.sway += balloon.swaySpeed * dt;
    balloon.x += Math.sin(balloon.sway) * drift * dt;
    if (t < plan.encoreUntil && balloon.y < -90) balloon.y = height + 28;
  }
  for (let i = world.confetti.length - 1; i >= 0; i--) {
    const bit = world.confetti[i];
    bit.sway += bit.swaySpeed * dt;
    bit.x += Math.sin(bit.sway) * 22 * dt + bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.rot += bit.vr * dt;
    if (bit.x < -24) bit.x = width + 12;
    else if (bit.x > width + 24) bit.x = -12;
    if (bit.y > height + 20) {
      if (t < plan.confettiFor) {
        bit.y = -16 - world.random() * 40;
        bit.x = world.random() * width;
        world.confettiFalls += 1;
      } else world.confetti.splice(i, 1);
    }
  }
}

function drawBalloon(ctx, balloon) {
  ctx.save();
  ctx.translate(balloon.x, balloon.y);
  ctx.rotate(Math.sin(balloon.sway) * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, balloon.r * 0.92);
  ctx.quadraticCurveTo(10, balloon.r + 16, 0, balloon.r + 34);
  ctx.strokeStyle = 'rgba(42,28,16,0.8)';
  ctx.lineWidth = 1.25;
  ctx.stroke();
  const gloss = ctx.createRadialGradient(-balloon.r * 0.28, -balloon.r * 0.34, balloon.r * 0.05, 0, 0, balloon.r);
  gloss.addColorStop(0, balloon.gloss);
  gloss.addColorStop(0.16, balloon.color);
  gloss.addColorStop(1, balloon.shade);
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(0, 0, balloon.r * 0.78, balloon.r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,28,16,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = balloon.shade;
  ctx.beginPath();
  ctx.moveTo(-3.5, balloon.r * 0.9);
  ctx.lineTo(0, balloon.r * 0.9 + 7);
  ctx.lineTo(3.5, balloon.r * 0.9);
  ctx.fill();
  ctx.restore();
}

function drawDebris(ctx, bit) {
  ctx.save();
  ctx.translate(bit.x, bit.y);
  ctx.globalAlpha = bit.alpha;
  ctx.fillStyle = bit.color;
  if (bit.kind === 'powder') {
    ctx.beginPath();
    ctx.ellipse(0, 0, bit.w * 0.55, bit.h * 0.42, bit.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(0.85, bit.alpha + 0.2);
    for (const speck of bit.specks) {
      ctx.beginPath();
      ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.rotate(bit.rot);
    const w = bit.w;
    const h = bit.h;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.2);
    ctx.lineTo(w * 0.12, -h * 0.58);
    ctx.lineTo(w * 0.52, -h * 0.05);
    ctx.lineTo(w * 0.26, h * 0.52);
    ctx.lineTo(-w * 0.2, h * 0.4);
    ctx.lineTo(-w * 0.48, h * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawConfettiBit(ctx, bit) {
  ctx.save();
  ctx.translate(bit.x, bit.y);
  ctx.rotate(bit.rot);
  ctx.fillStyle = bit.color;
  ctx.globalAlpha = 0.92;
  if (bit.shape === 'petal') {
    ctx.beginPath();
    ctx.ellipse(0, 0, bit.w * 0.38, bit.h * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(bit.w * 0.28, -bit.h * 0.1, bit.w * 0.24, bit.h * 0.32, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h * 0.46);
  }
  ctx.restore();
}

function drawCelebration(ctx, world) {
  const { width, height } = world;
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const bit of world.debris) if (bit.kind === 'powder') drawDebris(ctx, bit);
  for (const bit of world.debris) if (bit.kind !== 'powder') drawDebris(ctx, bit);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const flash of world.flashes) {
    const u = 1 - flash.age / flash.life;
    const radius = flash.radius * (0.4 + u);
    const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
    glow.addColorStop(0, `rgba(255,246,212,${0.85 * u})`);
    glow.addColorStop(0.45, `rgba(224,180,76,${0.35 * u})`);
    glow.addColorStop(1, 'rgba(224,180,76,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const rocket of world.rockets) {
    ctx.strokeStyle = 'rgba(248,220,138,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    rocket.trail.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.fillStyle = '#fff6d4';
    ctx.beginPath();
    ctx.arc(rocket.px, rocket.py, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of world.particles) {
    const life = 1 - p.age / p.life;
    const flicker = 0.65 + 0.35 * Math.sin(p.twinkle + p.age * 28);
    ctx.globalAlpha = Math.max(0, life) * flicker;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, p.size * life);
    ctx.beginPath();
    p.trail.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.8, p.size * life), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const balloon of world.balloons) {
    if (balloon.y < height + 40 && balloon.y > -90) drawBalloon(ctx, balloon);
  }
  for (const bit of world.confetti) drawConfettiBit(ctx, bit);
  ctx.globalAlpha = 1;
}

export function openCelebration(dialog, { numbers, ticketIndex, colorOf, reducedMotion = false, audioContext = null, onClose }) {
  const plan = celebrationPlan(reducedMotion);
  dialog.replaceChildren();
  dialog.classList.toggle('is-calm', reducedMotion);
  const canvas = document.createElement('canvas');
  canvas.className = 'celebration-fx';
  canvas.setAttribute('aria-hidden', 'true');
  const card = document.createElement('div');
  card.className = 'celebration-card';
  const kicker = document.createElement('p');
  kicker.className = 'celebration-kicker';
  kicker.textContent = `第 ${ticketIndex} 注`;
  const heading = document.createElement('h2');
  heading.id = 'celebration-title';
  heading.textContent = plan.heading;
  const row = document.createElement('div');
  row.className = 'celebration-numbers';
  row.setAttribute('aria-label', `六個正選 ${numbers.join('、')}`);
  numbers.forEach((n, index) => {
    const chip = document.createElement('div');
    chip.className = `tv-digit ${colorOf(n)}`;
    chip.style.animationDelay = `${0.08 + index * 0.07}s`;
    chip.textContent = String(n).padStart(2, '0');
    row.append(chip);
  });
  const note = document.createElement('p');
  note.className = 'celebration-note';
  note.textContent = '彩排情境，不是真實開獎。';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'celebration-dismiss';
  close.textContent = '返回結果';
  close.addEventListener('click', event => {
    event.stopPropagation();
    onClose?.();
  });
  card.append(kicker, heading, row, note, close);
  dialog.append(canvas, card);
  dialog.hidden = false;
  dialog.dataset.applause = 'pending';

  const ctx = canvas.getContext('2d');
  let width = 1, height = 1, narrow = false;
  const fit = () => {
    const rect = dialog.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    narrow = width < 760;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const world = createCelebrationWorld(plan, width, height, Math.random);
  const onResize = () => {
    fit();
    world.width = width;
    world.height = height;
    world.narrow = narrow;
  };
  window.addEventListener('resize', onResize);

  let held = false;
  let startedAt = 0;
  let last = 0;
  let raf = 0;
  let stopped = false;
  const tick = now => {
    if (stopped) return;
    const dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    const t = (now - startedAt) / 1000;
    if (t >= plan.showSeconds) {
      if (!held) {
        held = true;
        stepCelebration(world, dt, plan.showSeconds);
        drawCelebration(ctx, world);
      }
      return;
    }
    stepCelebration(world, dt, t);
    drawCelebration(ctx, world);
    raf = requestAnimationFrame(tick);
  };

  let applause = { stop() {}, started: false, reason: 'unavailable' };
  let audioStarted = false;
  const startApplause = () => {
    if (audioStarted || stopped) return;
    audioStarted = true;
    try {
      applause = playCelebrationAudio(audioContext, plan);
      dialog.dataset.applause = applause.started ? 'playing' : 'unavailable';
    } catch {
      dialog.dataset.applause = 'blocked';
    }
  };
  const kick = () => {
    if (stopped || startedAt) return;
    startedAt = performance.now();
    last = startedAt;
    raf = requestAnimationFrame(tick);
  };
  // Paint the heading first, then build the audio and start the picture on
  // the same clock so the booms stay with the bursts.
  requestAnimationFrame(() => {
    if (stopped) return;
    if (audioContext && audioContext.state === 'running') {
      startApplause();
      kick();
    } else if (audioContext && typeof audioContext.resume === 'function') {
      audioContext.resume().then(() => {
        if (stopped) return;
        if (audioContext.state === 'running') startApplause();
        else dialog.dataset.applause = 'blocked';
        kick();
      }).catch(() => {
        if (!stopped) dialog.dataset.applause = 'blocked';
        kick();
      });
      window.setTimeout(kick, 700);
    } else {
      dialog.dataset.applause = 'unavailable';
      kick();
    }
  });

  close.focus();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    applause.stop();
  };
  return stop;
}


// End-of-rehearsal celebration: canvas fireworks, balloons and confetti in the
// house gold palette. Audio is synthesized in the page's AudioContext and mixed
// on top of the existing soundtrack: aerial fireworks (boom, crackle, whistle)
// plus a long applause-and-cheers bed. Nothing here is a recording.
export const CELEBRATION_HEADING = '恭喜你中頭獎';

const GOLD = ['#fff6d4', '#ffe7a4', '#f8dc8a', '#e8c36a', '#d7a441', '#c4a15a', '#a98442', '#8a6424', '#f4f1e9'];
const BALLOON_PAIRS = [
  ['#fff6d4', '#e0b44c'],
  ['#f8dc8a', '#b8893c'],
  ['#fffaf0', '#c4a15a'],
  ['#f0d59a', '#8a6424'],
  ['#ffe7a4', '#a98442']
];

export function celebrationPlan(reduced) {
  if (reduced) {
    return {
      heading: CELEBRATION_HEADING,
      reduced: true,
      applauseSeconds: 5.4,
      fadeSeconds: 1.35,
      launchLead: 0,
      bursts: [
        { t: 0.08, x: 0.34, y: 0.28, power: 0.85, kind: 'still', whistle: true },
        { t: 0.85, x: 0.66, y: 0.26, power: 0.75, kind: 'still' },
        { t: 1.55, x: 0.5, y: 0.24, power: 0.9, kind: 'still' }
      ],
      balloonCount: 5,
      confettiPerSecond: 10,
      confettiFor: 2.2,
      encoreUntil: 0
    };
  }
  return {
    heading: CELEBRATION_HEADING,
    reduced: false,
    applauseSeconds: 12.6,
    fadeSeconds: 2.5,
    launchLead: 0.48,
    bursts: [
      { t: 0.12, x: 0.22, y: 0.24, power: 0.95, kind: 'peony', whistle: true },
      { t: 0.62, x: 0.78, y: 0.2, power: 0.9, kind: 'peony' },
      { t: 1.25, x: 0.5, y: 0.16, power: 1.15, kind: 'crown' },
      { t: 2.15, x: 0.3, y: 0.3, power: 0.85, kind: 'willow' },
      { t: 2.85, x: 0.72, y: 0.26, power: 1, kind: 'peony' },
      { t: 3.6, x: 0.16, y: 0.22, power: 0.8, kind: 'peony', whistle: true },
      { t: 4.45, x: 0.84, y: 0.28, power: 0.95, kind: 'willow' },
      { t: 5.25, x: 0.48, y: 0.18, power: 1.2, kind: 'crown' },
      { t: 6.15, x: 0.28, y: 0.27, power: 0.85, kind: 'peony' },
      { t: 7.05, x: 0.7, y: 0.22, power: 1, kind: 'crown', whistle: true },
      { t: 8.05, x: 0.38, y: 0.24, power: 0.9, kind: 'peony' },
      { t: 8.95, x: 0.62, y: 0.2, power: 0.95, kind: 'willow' },
      { t: 9.9, x: 0.5, y: 0.16, power: 1.15, kind: 'crown' },
      { t: 10.85, x: 0.24, y: 0.26, power: 0.8, kind: 'peony' }
    ],
    balloonCount: 8,
    confettiPerSecond: 22,
    confettiFor: 12.2,
    encoreUntil: 13
  };
}

const SHELL = {
  peony: { tail: 1.05, crackle: 160, spread: 1.45, boom: 1 },
  willow: { tail: 1.55, crackle: 120, spread: 0.8, boom: 0.9 },
  crown: { tail: 1.15, crackle: 220, spread: 1.4, boom: 1.08 },
  still: { tail: 0.8, crackle: 90, spread: 1.2, boom: 0.8 }
};

function addSample(left, right, index, sample, pan) {
  if (index < 0 || index >= left.length || !Number.isFinite(sample)) return;
  const angle = Math.min(1, Math.max(0, pan)) * Math.PI / 2;
  left[index] += sample * Math.cos(angle);
  right[index] += sample * Math.sin(angle);
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
    left[i] = Math.tanh(left[i]);
    right[i] = Math.tanh(right[i]);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const gain = peak > 0.0001 ? target / peak : 1;
  for (let i = 0; i < left.length; i++) {
    left[i] *= gain;
    right[i] *= gain;
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

// Aerial shell: a pitch-dropping sub and a lowpass that sweeps from a bright
// report down into rumble, then a long trail of mid crackles and high sparks.
// A balloon pop is only the bright report and dies within a few dozen milliseconds.
function writeBoom(left, right, sampleRate, startSec, power, pan, random, shell) {
  const tail = shell.tail;
  const n = Math.floor(sampleRate * tail);
  const start = Math.floor(startSec * sampleRate);
  let lp = 0;
  let hp = 0;
  let prev = 0;
  let phase = 0;
  const f0 = 88 + random() * 36;
  const weight = 0.82 * power * shell.boom;
  const hpA = Math.exp(-2 * Math.PI * 28 / sampleRate);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const cutoff = 62 + 2600 * Math.exp(-t / 0.065);
    const a = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, sampleRate * 0.45) / sampleRate);
    const white = random() * 2 - 1;
    hp = hpA * (hp + white - prev);
    prev = white;
    lp += a * (hp - lp);
    const bodyEnv = Math.exp(-t / 0.12);
    const f = 40 + (f0 - 40) * Math.exp(-t / 0.09);
    phase += 2 * Math.PI * f / sampleRate;
    const subEnv = Math.exp(-t / 0.16);
    const sub = (Math.sin(phase) * 0.34 + Math.sin(phase * 0.5) * 0.14) * subEnv;
    const crack = t < 0.04 ? (white - lp) * Math.exp(-t / 0.011) * 0.2 : 0;
    addSample(left, right, start + i, (lp * bodyEnv * 1.25 + sub + crack) * weight, pan);
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
    const sparkPan = pan + (random() - 0.5) * 0.42;
    for (let k = 0; k < grains; k++) {
      const env = Math.sin(Math.PI * (k + 0.5) / grains);
      const white = random() * 2 - 1;
      state += a * (white - state);
      const bright = mid ? state : white - state;
      addSample(left, right, i0 + k, bright * env * amp, sparkPan);
    }
  }
}

function writeWhistle(left, right, sampleRate, startSec, dur, pan, power, random) {
  const n = Math.max(2, Math.floor(sampleRate * dur));
  const start = Math.floor(startSec * sampleRate);
  let phase = 0;
  let air = 0;
  const fStart = 640 + random() * 160;
  const fEnd = 2000 + random() * 640;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const f = fStart * Math.pow(fEnd / fStart, Math.min(1, u / 0.92));
    const vib = Math.sin(2 * Math.PI * 11 * (i / sampleRate)) * f * 0.007;
    phase += 2 * Math.PI * (f + vib) / sampleRate;
    const reed = Math.tanh(2.6 * Math.sin(phase));
    const white = random() * 2 - 1;
    air = air * 0.72 + white * 0.28;
    const env = Math.sin(Math.min(1, u / 0.1) * Math.PI * 0.5) * (u > 0.84 ? (1 - u) / 0.16 : 1);
    addSample(left, right, start + i, (reed * 0.78 + air * 0.16) * env * 0.48 * power, pan);
  }
}

export function fireworkCues(plan) {
  const lead = plan.launchLead || 0;
  const calm = !!plan.reduced;
  const cues = [];
  for (const burst of plan.bursts) {
    const shell = SHELL[burst.kind] || SHELL.peony;
    const scale = calm ? 0.62 : 1;
    if (burst.whistle) {
      const dur = lead > 0 ? lead : 0.42;
      cues.push({ t: burst.t, type: 'whistle', dur, pan: burst.x, power: burst.power });
      cues.push({
        t: burst.t + dur * 0.94,
        type: 'boom',
        pan: burst.x,
        power: burst.power,
        tail: shell.tail * (calm ? 0.8 : 1),
        crackle: Math.round(shell.crackle * scale),
        spread: shell.spread,
        boom: shell.boom,
        crown: burst.kind === 'crown' && !calm
      });
    } else {
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
  for (const cue of cues) {
    if (cue.type === 'whistle') writeWhistle(left, right, sampleRate, cue.t, cue.dur, cue.pan, cue.power, random);
    else writeBoom(left, right, sampleRate, cue.t, cue.power, cue.pan, random, cue);
  }
  fadeEdges(left, right, sampleRate, 0.012, 0.4);
  const peak = softenAndNormalize(left, right, 0.9);
  return { left, right, peak };
}

const CHEER = [
  { f0: 188, f1: 276, formants: [430, 880, 2140], dur: 0.64 },
  { f0: 246, f1: 430, formants: [540, 1680, 2580], dur: 0.36 },
  { f0: 156, f1: 214, formants: [700, 1220, 2460], dur: 0.72 }
];

function writeCheer(left, right, sampleRate, startSec, random) {
  const style = CHEER[Math.floor(random() * CHEER.length)];
  const dur = style.dur * (0.88 + random() * 0.28);
  const n = Math.floor(sampleRate * dur);
  const start = Math.floor(startSec * sampleRate);
  const voices = style.formants.map((freq, index) => bandpass(freq, index === 0 ? 4.2 : 6.2, sampleRate));
  let phase = 0;
  const pan = 0.28 + random() * 0.44;
  const amp = 0.34 + random() * 0.16;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const f0 = style.f0 + (style.f1 - style.f0) * Math.sin(Math.PI * Math.min(1, u));
    const vib = Math.sin(2 * Math.PI * 5.2 * (i / sampleRate)) * f0 * 0.016;
    phase += 2 * Math.PI * (f0 + vib) / sampleRate;
    const saw = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    const excite = Math.tanh(saw * 1.35);
    let y = 0;
    for (const voice of voices) y += voice.process(excite);
    const pulse = Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.18;
    const env = Math.sin(Math.min(1, u / 0.16) * Math.PI * 0.5) * Math.pow(1 - u, 0.62);
    addSample(left, right, start + i, (y * 0.85 + pulse) * env * amp * 0.72, pan);
  }
}

// Dense overlapping claps plus pitched cheers. The bed stays continuous so it
// reads as a crowd, not as separate balloon-like pops.
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
    const pan = random();
    const cut = 850 + random() * 2400;
    const a = 1 - Math.exp(-2 * Math.PI * Math.min(cut, sampleRate * 0.45) / sampleRate);
    let lp = 0;
    for (let i = 0; i < dur; i++) {
      const u = i / dur;
      const env = Math.sin(Math.min(1, u / 0.14) * Math.PI * 0.5) * Math.exp(-u * 3.1);
      const white = random() * 2 - 1;
      lp += a * (white - lp);
      addSample(left, right, start + i, (lp * 0.82 + (white - lp) * 0.38) * env * amp, pan);
    }
  }
  let murmurL = 0;
  let murmurR = 0;
  let walk = 0.55;
  for (let i = 0; i < total; i++) {
    walk = Math.min(0.95, Math.max(0.28, walk + (random() - 0.5) * 0.0016));
    const whiteL = random() * 2 - 1;
    const whiteR = random() * 2 - 1;
    murmurL = murmurL * 0.93 + whiteL * 0.07;
    murmurR = murmurR * 0.93 + whiteR * 0.07;
    const wobble = 0.9 + 0.1 * Math.sin((i / sampleRate) * 2 * Math.PI * 0.27);
    left[i] += murmurL * walk * 0.2 * wobble;
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

function playBuffer(audioContext, rendered, destination, when) {
  const buffer = audioContext.createBuffer(2, rendered.left.length, audioContext.sampleRate);
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
  const crowd = synthesizeCrowd(audioContext.sampleRate, seconds, plan.fadeSeconds, random);
  const fireworks = synthesizeFireworkLayer(audioContext.sampleRate, seconds, cues, random);
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
    playBuffer(audioContext, crowd, crowdGain, now),
    playBuffer(audioContext, fireworks, fireGain, now)
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

function spawnBurst(particles, x, y, power, kind, narrow) {
  const willow = kind === 'willow';
  const count = Math.round((kind === 'still' ? 42 : willow ? 54 : 72) * power * (narrow ? 0.7 : 1));
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
    const ring = kind === 'crown' && i % 3 === 0 ? 0.62 : kind === 'still' ? 0.75 + (i % 4) * 0.08 : 0.45 + Math.random() * 0.7;
    const speed = (kind === 'still' ? 86 : 150 + Math.random() * 230) * power * ring;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * (willow ? 0.72 : 1),
      age: 0,
      life: kind === 'still' ? 1.35 : willow ? 1.7 + Math.random() * 0.5 : 1.05 + Math.random() * 0.55,
      size: kind === 'still' ? 3.1 : 2.3 + Math.random() * 2.1,
      color: GOLD[i % GOLD.length],
      gravity: kind === 'still' ? 18 : willow ? 46 : 28,
      drag: willow ? 0.55 : 0.72,
      twinkle: Math.random() * Math.PI * 2,
      trail: []
    });
  }
}

function drawBalloon(ctx, balloon) {
  ctx.save();
  ctx.translate(balloon.x, balloon.y);
  ctx.rotate(Math.sin(balloon.sway) * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, balloon.r * 0.92);
  ctx.quadraticCurveTo(10, balloon.r + 16, 0, balloon.r + 34);
  ctx.strokeStyle = 'rgba(90,62,28,0.85)';
  ctx.lineWidth = 1.25;
  ctx.stroke();
  const gloss = ctx.createRadialGradient(-balloon.r * 0.28, -balloon.r * 0.34, balloon.r * 0.08, 0, 0, balloon.r);
  gloss.addColorStop(0, '#fffaf0');
  gloss.addColorStop(0.42, balloon.color);
  gloss.addColorStop(1, balloon.shade);
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(0, 0, balloon.r * 0.78, balloon.r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(62,42,16,0.35)';
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

function drawCalmStill(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cx = width * 0.5, cy = height * 0.3;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const dist = 28 + (i % 5) * 16;
    ctx.fillStyle = GOLD[i % GOLD.length];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist * 0.72, i % 4 === 0 ? 3.2 : 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const pair = BALLOON_PAIRS[i % BALLOON_PAIRS.length];
    drawBalloon(ctx, {
      x: width * (i % 2 === 0 ? 0.14 + i * 0.04 : 0.86 - i * 0.04),
      y: height * (0.42 + (i % 3) * 0.08),
      r: 16 + (i % 3) * 4,
      sway: i,
      color: pair[0],
      shade: pair[1]
    });
  }
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 18; i++) {
    ctx.save();
    ctx.translate((i * 47) % width, height * (0.15 + (i % 6) * 0.1));
    ctx.rotate(i);
    ctx.fillStyle = GOLD[i % GOLD.length];
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  }
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
  close.addEventListener('click', () => onClose?.());
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
  const onResize = () => fit();
  window.addEventListener('resize', onResize);

  const particles = [];
  const rockets = [];
  const balloons = [];
  const confetti = [];
  const flashes = [];
  const launched = new Set();
  for (let i = 0; i < plan.balloonCount; i++) {
    const pair = BALLOON_PAIRS[i % BALLOON_PAIRS.length];
    const leftSide = i % 2 === 0;
    balloons.push({
      x: width * (leftSide ? 0.08 + Math.random() * 0.2 : 0.72 + Math.random() * 0.2),
      y: height * (0.62 + Math.random() * 0.7),
      r: (narrow ? 14 : 18) + Math.random() * 10,
      vy: reducedMotion ? 28 + Math.random() * 18 : 52 + Math.random() * 48,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 1.1 + Math.random() * 0.8,
      color: pair[0],
      shade: pair[1]
    });
  }
  let confettiDebt = 0;
  let frozen = false;
  const startedAt = performance.now();
  let last = startedAt;
  let raf = 0;

  const explode = (x, y, power, kind) => {
    spawnBurst(particles, x, y, power, kind, narrow);
    flashes.push({ x, y, age: 0, life: kind === 'still' ? 0.7 : 0.38, radius: (kind === 'crown' ? 74 : 52) * power });
    if (kind === 'crown') {
      window.setTimeout(() => {
        if (stopped) return;
        spawnBurst(particles, x, y, power * 0.55, 'peony', narrow);
      }, 180);
    }
  };

  const step = (dt, t) => {
    plan.bursts.forEach((burst, index) => {
      if (launched.has(index) || t < burst.t) return;
      launched.add(index);
      if (reducedMotion || burst.kind === 'still') explode(burst.x * width, burst.y * height, burst.power, 'still');
      else rockets.push({ x: burst.x * width + (Math.random() - 0.5) * 24, y: height + 8, tx: burst.x * width, ty: burst.y * height, age: 0, dur: plan.launchLead, power: burst.power, kind: burst.kind, trail: [] });
    });
    if (!reducedMotion && t < plan.confettiFor) {
      confettiDebt += plan.confettiPerSecond * dt;
      while (confettiDebt >= 1 && confetti.length < 220) {
        confettiDebt -= 1;
        confetti.push({
          x: Math.random() * width,
          y: -12 - Math.random() * 40,
          w: 7 + Math.random() * 5,
          h: 11 + Math.random() * 7,
          vy: 70 + Math.random() * 110,
          vx: (Math.random() - 0.5) * 40,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 6,
          color: GOLD[Math.floor(Math.random() * GOLD.length)]
        });
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const rocket = rockets[i];
      rocket.age += dt;
      const u = Math.min(1, rocket.age / rocket.dur);
      const eased = 1 - Math.pow(1 - u, 2);
      const x = rocket.x + (rocket.tx - rocket.x) * eased;
      const y = rocket.y + (rocket.ty - rocket.y) * eased;
      rocket.trail.push({ x, y });
      if (rocket.trail.length > 4) rocket.trail.shift();
      rocket.px = x; rocket.py = y;
      if (u >= 1) {
        explode(rocket.tx, rocket.ty, rocket.power, rocket.kind);
        rockets.splice(i, 1);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vx *= Math.exp(-p.drag * dt);
      p.vy = p.vy * Math.exp(-p.drag * dt) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.shift();
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].age += dt;
      if (flashes[i].age >= flashes[i].life) flashes.splice(i, 1);
    }
    for (const balloon of balloons) {
      balloon.y -= balloon.vy * dt;
      balloon.sway += balloon.swaySpeed * dt;
      balloon.x += Math.sin(balloon.sway) * 12 * dt;
      if (!reducedMotion && t < plan.encoreUntil && balloon.y < -80) balloon.y = height + 20;
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const bit = confetti[i];
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.rot += bit.vr * dt;
      bit.vx += Math.sin(bit.rot) * 8 * dt;
      if (bit.y > height + 20) confetti.splice(i, 1);
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const flash of flashes) {
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
    for (const rocket of rockets) {
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
    for (const p of particles) {
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
    for (const balloon of balloons) {
      if (balloon.y < height + 40 && balloon.y > -90) drawBalloon(ctx, balloon);
    }
    for (const bit of confetti) {
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.rot);
      ctx.fillStyle = bit.color;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  let stopped = false;
  const tick = now => {
    if (stopped) return;
    const dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    const t = (now - startedAt) / 1000;
    if (reducedMotion && t > 2.15 && !frozen) {
      frozen = true;
      drawCalmStill(ctx, width, height);
      return;
    }
    step(dt, t);
    draw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  let applause = { stop() {}, started: false, reason: 'unavailable' };
  const startApplause = () => {
    try {
      applause = playCelebrationAudio(audioContext, plan);
      dialog.dataset.applause = applause.started ? 'playing' : 'unavailable';
    } catch {
      dialog.dataset.applause = 'blocked';
    }
  };
  if (audioContext && audioContext.state === 'running') startApplause();
  else if (audioContext && typeof audioContext.resume === 'function') {
    audioContext.resume().then(() => {
      if (!stopped && audioContext.state === 'running') startApplause();
      else if (!stopped) dialog.dataset.applause = 'blocked';
    }).catch(() => { if (!stopped) dialog.dataset.applause = 'blocked'; });
  } else dialog.dataset.applause = 'unavailable';

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

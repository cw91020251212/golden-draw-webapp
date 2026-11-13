// End-of-rehearsal celebration: canvas fireworks, balloons and confetti in the
// house gold palette, plus applause synthesized in the page's AudioContext.
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
      applauseSeconds: 3.4,
      bursts: [{ t: 0.08, x: 0.5, y: 0.3, power: 1, kind: 'still' }],
      balloonCount: 5,
      confettiPerSecond: 10,
      confettiFor: 2.2,
      encoreUntil: 0
    };
  }
  return {
    heading: CELEBRATION_HEADING,
    applauseSeconds: 7.8,
    bursts: [
      { t: 0.15, x: 0.22, y: 0.24, power: 0.95, kind: 'peony' },
      { t: 0.55, x: 0.78, y: 0.2, power: 0.9, kind: 'peony' },
      { t: 1.2, x: 0.5, y: 0.16, power: 1.2, kind: 'crown' },
      { t: 2.05, x: 0.32, y: 0.3, power: 0.85, kind: 'willow' },
      { t: 2.7, x: 0.7, y: 0.26, power: 1, kind: 'peony' },
      { t: 3.55, x: 0.16, y: 0.22, power: 0.8, kind: 'peony' },
      { t: 4.35, x: 0.84, y: 0.28, power: 0.95, kind: 'willow' },
      { t: 5.15, x: 0.48, y: 0.18, power: 1.25, kind: 'crown' },
      { t: 6.2, x: 0.36, y: 0.24, power: 0.75, kind: 'peony' },
      { t: 7.15, x: 0.64, y: 0.2, power: 0.9, kind: 'crown' }
    ],
    balloonCount: 8,
    confettiPerSecond: 22,
    confettiFor: 8.5,
    encoreUntil: 9.5
  };
}

function fadeInOut(u) {
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.12) return u / 0.12;
  if (u > 0.78) return (1 - u) / 0.22;
  return 1;
}

// Many short filtered-noise claps, panned across a stereo field. Not a recording.
export function synthesizeApplause(sampleRate, seconds, random = Math.random) {
  const total = Math.max(1, Math.floor(sampleRate * seconds));
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const claps = Math.max(8, Math.floor(seconds * 26));
  for (let c = 0; c < claps; c++) {
    const place = (c + random()) / claps;
    const env = fadeInOut(place);
    if (env <= 0) continue;
    const start = Math.min(total - 2, Math.floor(place * total));
    const dur = Math.floor(sampleRate * (0.018 + random() * 0.045));
    const amp = (0.22 + random() * 0.78) * (0.55 + env * 0.45);
    const pan = random();
    let noise = 0;
    for (let i = 0; i < dur; i++) {
      const idx = start + i;
      if (idx >= total) break;
      const decay = Math.pow(1 - i / dur, 1.85);
      noise = noise * 0.42 + (random() * 2 - 1) * 0.58;
      const sample = noise * decay * amp;
      left[idx] += sample * (1 - pan);
      right[idx] += sample * pan;
    }
  }
  let bed = 0;
  for (let i = 0; i < total; i++) {
    const swell = fadeInOut(i / total);
    bed = bed * 0.965 + (random() * 2 - 1) * 0.035;
    const murmur = bed * swell * 0.28;
    left[i] += murmur;
    right[i] += murmur * 0.92;
  }
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = peak > 0 ? 0.86 / peak : 1;
  for (let i = 0; i < total; i++) {
    left[i] *= gain;
    right[i] *= gain;
  }
  return { left, right, peak: peak * gain };
}

function playApplause(audioContext, seconds, reduced) {
  if (!audioContext || typeof audioContext.createBuffer !== 'function') return { stop() {}, started: false, reason: 'unavailable' };
  const { left, right } = synthesizeApplause(audioContext.sampleRate, seconds);
  const buffer = audioContext.createBuffer(2, left.length, audioContext.sampleRate);
  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const highpass = audioContext.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 520;
  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 5200;
  const gain = audioContext.createGain();
  const level = reduced ? 0.16 : 0.3;
  const now = audioContext.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(level, now + 0.18);
  gain.gain.setValueAtTime(level, now + Math.max(0.2, seconds - 1.15));
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(audioContext.destination);
  source.start(now);
  source.stop(now + seconds + 0.05);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const t = audioContext.currentTime;
    try {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      source.stop(t + 0.24);
    } catch { /* already stopped */ }
  };
  source.onended = () => {
    try { source.disconnect(); highpass.disconnect(); lowpass.disconnect(); gain.disconnect(); } catch { /* already torn down */ }
  };
  return { stop, started: true, reason: 'playing' };
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
      else rockets.push({ x: burst.x * width + (Math.random() - 0.5) * 24, y: height + 8, tx: burst.x * width, ty: burst.y * height, age: 0, dur: 0.42 + Math.random() * 0.22, power: burst.power, kind: burst.kind, trail: [] });
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
      applause = playApplause(audioContext, plan.applauseSeconds, reducedMotion);
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

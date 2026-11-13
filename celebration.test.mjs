import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELEBRATION_HEADING,
  celebrationPlan,
  fireworkCues,
  playCelebrationAudio,
  synthesizeCrowd,
  synthesizeFireworkLayer
} from './celebration.js';

function lcg(seed) {
  let state = seed;
  return () => {
    state = state * 16807 % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function slice(samples, sampleRate, t0, t1) {
  const a = Math.max(0, Math.floor(t0 * sampleRate));
  const b = Math.min(samples.length, Math.floor(t1 * sampleRate));
  return samples.subarray(a, b);
}

function rms(samples) {
  if (!samples.length) return 0;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  return Math.sqrt(energy / samples.length);
}

function lowpassRms(samples, sampleRate, cutoff) {
  const a = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
  let y = 0;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) {
    y += a * (samples[i] - y);
    energy += y * y;
  }
  return Math.sqrt(energy / samples.length);
}

function highpassEnergy(samples) {
  if (samples.length < 2) return 0;
  let energy = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i] - samples[i - 1];
    energy += d * d;
  }
  return energy / (samples.length - 1);
}

function periodScore(samples, sampleRate, lowHz, highHz) {
  const minLag = Math.max(1, Math.floor(sampleRate / highHz));
  const maxLag = Math.min(samples.length - 2, Math.floor(sampleRate / lowHz));
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  if (energy < 1e-10 || maxLag <= minLag) return 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const limit = samples.length - lag;
    for (let i = 0; i < limit; i++) corr += samples[i] * samples[i + lag];
    best = Math.max(best, corr / energy);
  }
  return best;
}

test('full celebration keeps fireworks and the crowd going, and the calm plan is shorter', () => {
  const full = celebrationPlan(false);
  const calm = celebrationPlan(true);
  assert.equal(full.heading, '恭喜你中頭獎');
  assert.equal(CELEBRATION_HEADING, full.heading);
  assert.equal(calm.heading, CELEBRATION_HEADING);
  assert.ok(full.applauseSeconds >= 12);
  assert.ok(full.fadeSeconds >= 2);
  assert.ok(full.bursts.length >= 12);
  assert.ok(full.bursts.at(-1).t >= 10);
  assert.ok(full.encoreUntil >= full.applauseSeconds);
  assert.ok(full.confettiFor >= 11);
  assert.ok(full.launchLead >= 0.4 && full.launchLead <= 0.6);
  assert.ok(calm.applauseSeconds >= 4.5);
  assert.ok(calm.applauseSeconds < full.applauseSeconds);
  assert.ok(calm.fadeSeconds >= 1);
  assert.ok(calm.bursts.length >= 2);
  assert.ok(calm.balloonCount > 0);

  const cues = fireworkCues(full);
  const booms = cues.filter(cue => cue.type === 'boom');
  assert.equal(cues.length, booms.length);
  assert.ok(booms.length >= 12);
  assert.ok(booms.every(cue => cue.tail >= 0.55 && cue.crackle >= 100));
  assert.ok(Math.min(...booms.map(cue => cue.t)) < 1);
  assert.ok(Math.max(...booms.map(cue => cue.t)) > 10);
  assert.equal(full.bursts.some(burst => burst.whistle), false);
  const calmCues = fireworkCues(calm);
  assert.ok(calmCues.every(cue => cue.type === 'boom'));
  assert.ok(calmCues.some(cue => cue.crackle >= 40 && cue.tail >= 0.4));
});

test('applause and cheers stay loud well past a short clap, then fade', () => {
  const plan = celebrationPlan(false);
  const { left, cheerTimes } = synthesizeCrowd(8000, plan.applauseSeconds, plan.fadeSeconds, lcg(11));
  assert.equal(left.length, Math.floor(8000 * plan.applauseSeconds));
  const early = rms(slice(left, 8000, 1.2, 2.4));
  const middle = rms(slice(left, 8000, 5.5, 6.8));
  const late = rms(slice(left, 8000, 8.4, 9.6));
  const tail = rms(slice(left, 8000, plan.applauseSeconds - 0.45, plan.applauseSeconds));
  assert.ok(early > 0.04);
  assert.ok(middle > early * 0.55);
  assert.ok(late > early * 0.45);
  assert.ok(tail < late * 0.45);
  assert.ok(cheerTimes.length >= 8);
  assert.ok(cheerTimes.some(time => time > 8));
  const cheerAt = cheerTimes.find(time => time > 4 && time < 7);
  const cheer = slice(left, 8000, cheerAt, cheerAt + 0.4);
  assert.ok(rms(cheer) > 0.04);
  assert.ok(periodScore(cheer, 8000, 200, 2500) < 0.28);
});

test('firework shells are booms with crackle trails and no siren or beep', () => {
  const rate = 8000;
  const cues = [
    { t: 0.4, type: 'boom', pan: 0.35, power: 1, tail: 1.15, crackle: 160, spread: 1.45, boom: 1, crown: false }
  ];
  const { left } = synthesizeFireworkLayer(rate, 2.2, cues, lcg(5));
  const toneOf = samples => {
    const high = new Float32Array(samples.length);
    const coeff = Math.exp(-2 * Math.PI * 450 / rate);
    let state = 0;
    let prev = 0;
    for (let i = 0; i < samples.length; i++) {
      state = coeff * (state + samples[i] - prev);
      prev = samples[i];
      high[i] = state;
    }
    return periodScore(high, rate, 400, 2200);
  };
  let peakTone = 0;
  for (let t = 0.2; t < 1.8; t += 0.08) {
    const window = slice(left, rate, t, t + 0.09);
    if (rms(window) < 0.02) continue;
    peakTone = Math.max(peakTone, toneOf(window));
  }
  const beep = new Float32Array(Math.floor(rate * 0.09));
  let phase = 0;
  for (let i = 0; i < beep.length; i++) {
    phase += 2 * Math.PI * 880 / rate;
    beep[i] = Math.sin(phase);
  }
  assert.ok(toneOf(beep) > 0.8);
  assert.ok(peakTone < 0.4);

  const attack = slice(left, rate, 0.4, 0.52);
  const lowShare = lowpassRms(attack, rate, 140) / rms(attack);
  assert.ok(lowShare > 0.22);

  const pop = new Float32Array(left.length);
  const popStart = Math.floor(0.4 * rate);
  const popDur = Math.floor(rate * 0.022);
  let seed = 9;
  for (let i = 0; i < popDur; i++) {
    seed = seed * 16807 % 2147483647;
    const noise = ((seed - 1) / 2147483646) * 2 - 1;
    pop[popStart + i] = noise * Math.pow(1 - i / popDur, 1.7);
  }
  for (let i = pop.length - 1; i > 0; i--) pop[i] = pop[i] - pop[i - 1] * 0.85;
  const popAttack = slice(pop, rate, 0.4, 0.52);
  const popLowShare = lowpassRms(popAttack, rate, 140) / Math.max(1e-9, rms(popAttack));
  assert.ok(lowShare > popLowShare * 1.8);

  let lively = 0;
  for (let t = 0.62; t < 1.3; t += 0.07) {
    if (highpassEnergy(slice(left, rate, t, t + 0.06)) > 1e-5) lively += 1;
  }
  assert.ok(lively >= 6);
  const trail = highpassEnergy(slice(left, rate, 0.7, 1.2));
  const popTrail = highpassEnergy(slice(pop, rate, 0.7, 1.2));
  assert.ok(trail > popTrail * 8);
  const rumble = rms(slice(left, rate, 0.55, 0.85));
  assert.ok(rumble > rms(slice(pop, rate, 0.55, 0.85)) * 4);

  const show = synthesizeFireworkLayer(rate, celebrationPlan(false).applauseSeconds, fireworkCues(celebrationPlan(false)), lcg(1));
  let showTone = 0;
  for (let t = 0.2; t < 12; t += 0.12) {
    const window = slice(show.left, rate, t, t + 0.09);
    if (rms(window) < 0.02) continue;
    showTone = Math.max(showTone, toneOf(window));
  }
  assert.ok(showTone < 0.4);
});

test('dismiss fades and stops both the crowd and the fireworks', () => {
  const sources = [];
  const gains = [];
  const connections = [];
  const destination = { name: 'speakers' };
  const ctx = {
    sampleRate: 8000,
    currentTime: 3,
    state: 'running',
    destination,
    createBuffer(_channels, length) {
      const data = [new Float32Array(length), new Float32Array(length)];
      return {
        length,
        copyToChannel(src, index) { data[index].set(src.subarray(0, length)); }
      };
    },
    createBufferSource() {
      const node = {
        started: null,
        stopped: null,
        connect(dest) { connections.push(dest); },
        start(time) { node.started = time; },
        stop(time) { node.stopped = time; },
        disconnect() {}
      };
      sources.push(node);
      return node;
    },
    createGain() {
      const node = {
        gain: {
          value: 1,
          events: [],
          setValueAtTime(value, time) {
            node.gain.events.push({ type: 'set', value, time });
            node.gain.value = value;
          },
          exponentialRampToValueAtTime(value, time) {
            node.gain.events.push({ type: 'exp', value, time });
          },
          cancelScheduledValues(time) {
            node.gain.events.push({ type: 'cancel', time });
          }
        },
        connect(dest) { connections.push(dest); },
        disconnect() {}
      };
      gains.push(node);
      return node;
    }
  };
  const plan = celebrationPlan(false);
  const playing = playCelebrationAudio(ctx, plan, lcg(3));
  assert.equal(playing.started, true);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].started, 3);
  assert.equal(sources[1].started, 3);
  assert.ok(sources.every(source => source.buffer.length >= 8000 * 12));
  assert.ok(playing.cues.some(cue => cue.type === 'boom'));
  assert.ok(playing.cues.every(cue => cue.type === 'boom'));
  assert.ok(connections.includes(destination));
  assert.ok(connections.every(dest => dest === destination || gains.includes(dest)));
  const master = gains.find(gain => gain.gain.events.some(event => event.type === 'set' && event.value === 1));
  playing.stop();
  assert.ok(sources.every(source => source.stopped >= ctx.currentTime));
  assert.ok(master.gain.events.some(event => event.type === 'cancel'));
  assert.ok(master.gain.events.some(event => event.type === 'exp' && event.value <= 0.001 && event.time - 3 <= 0.5));
  const stoppedAt = sources[0].stopped;
  playing.stop();
  assert.equal(sources[0].stopped, stoppedAt);

  const missing = playCelebrationAudio(null, plan);
  assert.equal(missing.started, false);
  missing.stop();
});

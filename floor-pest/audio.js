export function createAudio() {
  let ctx = null;
  let noise = null;

  function context() {
    if (!ctx) ctx = new AudioContext();
    if (!noise) {
      const length = Math.floor(ctx.sampleRate * 0.25);
      noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }

  function burst(freq, duration, gainValue, pan, type) {
    const audio = context();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const panner = audio.createStereoPanner();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    panner.pan.value = pan;
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function rustle(duration, gainValue, pan, rate) {
    const audio = context();
    const now = audio.currentTime;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const panner = audio.createStereoPanner();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = rate;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    panner.pan.value = pan;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(audio.destination);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  return {
    async resume() {
      const audio = context();
      if (audio.state === 'running') return;
      await Promise.race([
        audio.resume().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 300))
      ]);
    },
    skitter(pan) {
      rustle(0.06, 0.045, pan, 2200);
    },
    step(pan) {
      burst(95, 0.09, 0.09, pan, 'sine');
    },
    crunch() {
      rustle(0.14, 0.22, 0, 500);
      burst(160, 0.16, 0.16, 0, 'triangle');
    },
    hurt() {
      burst(220, 0.08, 0.08, 0, 'square');
    },
    swat() {
      rustle(0.1, 0.16, 0, 900);
    },
    glass() {
      burst(640, 0.12, 0.05, 0, 'sawtooth');
    },
    flash() {
      burst(1600, 0.05, 0.03, 0, 'sine');
    }
  };
}

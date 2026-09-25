/**
 * Procedural sound design — every sound is synthesised with the Web Audio API (no audio files).
 * Silent until the user opts in (the gate or the nav toggle).
 */
type Sfx =
  | 'heartbeat'
  | 'whoosh'
  | 'glitch'
  | 'riserEmber'
  | 'riserTide'
  | 'swell'
  | 'impact'
  | 'laser'
  | 'pop'
  | 'shimmer'
  | 'blade'
  | 'hit'
  | 'tick'
  | 'click'
  | 'scan'
  | 'good'
  | 'alarm';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let reverbSend: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = false;
let drone: { stop: () => void } | null = null;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp).connect(ctx.destination);

  // Generated impulse response: decaying stereo noise.
  const len = Math.floor(ctx.sampleRate * 2.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  reverb = ctx.createConvolver();
  reverb.buffer = ir;
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.35;
  reverbSend.connect(reverb).connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
  const c = on ? ensure() : ctx;
  if (!c || !master) return;
  if (on && c.state === 'suspended') void c.resume();
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setTargetAtTime(on ? 0.7 : 0, c.currentTime, 0.12);
  if (!on) stopDrone();
}

export function audioEnabled() {
  return enabled;
}

function out(dry = 1, wet = 0.3) {
  const c = ctx!;
  const g = c.createGain();
  g.gain.value = dry;
  g.connect(master!);
  if (wet > 0) {
    const s = c.createGain();
    s.gain.value = wet;
    g.connect(s).connect(reverbSend!);
  }
  return g;
}

function noise(dur: number) {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start();
  src.stop(ctx!.currentTime + dur + 0.05);
  return src;
}

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function panner(pan: number) {
  const p = ctx!.createStereoPanner();
  p.pan.value = pan;
  return p;
}

export function playSfx(name: Sfx, opts: { pan?: number; gain?: number } = {}) {
  if (!enabled || !ctx || !master) return;
  const c = ctx;
  const t = c.currentTime + 0.005;
  const vol = opts.gain ?? 1;
  const pan = panner(opts.pan ?? 0);

  switch (name) {
    case 'heartbeat': {
      for (const [dt, f] of [[0, 1], [0.22, 0.8]] as const) {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(68, t + dt);
        o.frequency.exponentialRampToValueAtTime(34, t + dt + 0.25);
        const g = c.createGain();
        env(g, t + dt, 0.012, 0.9 * f * vol, 0.32);
        o.connect(g).connect(out(1, 0.15));
        o.start(t + dt);
        o.stop(t + dt + 0.4);
      }
      break;
    }
    case 'whoosh': {
      const n = noise(1.6);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(220, t);
      bp.frequency.exponentialRampToValueAtTime(3400, t + 0.7);
      bp.frequency.exponentialRampToValueAtTime(400, t + 1.5);
      const g = c.createGain();
      env(g, t, 0.35, 0.5 * vol, 1.1);
      n.connect(bp).connect(g).connect(pan).connect(out(1, 0.4));
      break;
    }
    case 'glitch': {
      for (let i = 0; i < 6; i++) {
        const st = t + i * 0.045 + Math.random() * 0.03;
        const n = noise(0.05);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1200 + Math.random() * 4000;
        const g = c.createGain();
        env(g, st, 0.002, 0.18 * vol, 0.03);
        n.connect(hp).connect(g).connect(panner(Math.random() * 2 - 1)).connect(out(1, 0.05));
      }
      break;
    }
    case 'riserEmber':
    case 'riserTide': {
      const ember = name === 'riserEmber';
      const o = c.createOscillator();
      o.type = ember ? 'sawtooth' : 'sine';
      o.frequency.setValueAtTime(ember ? 82 : 330, t);
      o.frequency.exponentialRampToValueAtTime(ember ? 330 : 1320, t + 2.8);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(ember ? 2400 : 6000, t + 2.8);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((ember ? 0.16 : 0.1) * vol, t + 2.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
      o.connect(lp).connect(g).connect(panner(ember ? -0.7 : 0.7)).connect(out(1, 0.5));
      o.start(t);
      o.stop(t + 3.05);
      break;
    }
    case 'swell': {
      const n = noise(0.8);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(200, t);
      lp.frequency.exponentialRampToValueAtTime(8000, t + 0.75);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45 * vol, t + 0.75);
      g.gain.linearRampToValueAtTime(0, t + 0.8);
      n.connect(lp).connect(g).connect(out(1, 0.2));
      break;
    }
    case 'impact': {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(26, t + 1.6);
      const g = c.createGain();
      env(g, t, 0.005, 1.1 * vol, 1.9);
      o.connect(g).connect(out(1, 0.6));
      o.start(t);
      o.stop(t + 2);
      const n = noise(2.4);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(6000, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 2.2);
      const g2 = c.createGain();
      env(g2, t, 0.003, 0.6 * vol, 2.2);
      n.connect(lp).connect(g2).connect(out(1, 0.9));
      break;
    }
    case 'laser': {
      const car = c.createOscillator();
      const mod = c.createOscillator();
      const mg = c.createGain();
      car.type = 'sawtooth';
      car.frequency.setValueAtTime(880, t);
      car.frequency.exponentialRampToValueAtTime(220, t + 2.2);
      mod.frequency.value = 55;
      mg.gain.value = 180;
      mod.connect(mg).connect(car.frequency);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.setValueAtTime(2400, t);
      bp.frequency.exponentialRampToValueAtTime(500, t + 2.2);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.15);
      g.gain.setValueAtTime(0.12 * vol, t + 1.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(-0.6, t);
      p.pan.linearRampToValueAtTime(0.6, t + 2.2);
      car.connect(bp).connect(g).connect(p).connect(out(1, 0.35));
      car.start(t);
      mod.start(t);
      car.stop(t + 2.35);
      mod.stop(t + 2.35);
      break;
    }
    case 'pop': {
      const n = noise(0.08);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 2500;
      bp.Q.value = 6;
      const g = c.createGain();
      env(g, t, 0.001, 0.22 * vol, 0.07);
      n.connect(bp).connect(g).connect(panner(Math.random() * 1.6 - 0.8)).connect(out(1, 0.25));
      break;
    }
    case 'shimmer': {
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = c.createGain();
        env(g, t + i * 0.06, 0.4, 0.06 * vol, 2.6);
        o.connect(g).connect(panner((i - 1.5) / 2)).connect(out(1, 0.8));
        o.start(t + i * 0.06);
        o.stop(t + 3.2);
      });
      break;
    }
    case 'blade': {
      const n = noise(0.6);
      const hp = c.createBiquadFilter();
      hp.type = 'bandpass';
      hp.Q.value = 8;
      hp.frequency.setValueAtTime(2000, t);
      hp.frequency.exponentialRampToValueAtTime(9000, t + 0.35);
      const g = c.createGain();
      env(g, t, 0.01, 0.35 * vol, 0.45);
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(-0.8, t);
      p.pan.linearRampToValueAtTime(0.8, t + 0.45);
      n.connect(hp).connect(g).connect(p).connect(out(1, 0.5));
      break;
    }
    case 'hit': {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.9);
      const g = c.createGain();
      env(g, t, 0.004, 0.7 * vol, 1.1);
      o.connect(g).connect(out(1, 0.6));
      o.start(t);
      o.stop(t + 1.2);
      break;
    }
    case 'tick': {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = 1500;
      const g = c.createGain();
      env(g, t, 0.001, 0.05 * vol, 0.035);
      o.connect(g).connect(pan).connect(out(1, 0));
      o.start(t);
      o.stop(t + 0.05);
      break;
    }
    case 'click': {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(260, t + 0.08);
      const g = c.createGain();
      env(g, t, 0.002, 0.12 * vol, 0.09);
      o.connect(g).connect(pan).connect(out(1, 0.1));
      o.start(t);
      o.stop(t + 0.12);
      break;
    }
    case 'scan': {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(220, t);
      o.frequency.linearRampToValueAtTime(660, t + 0.5);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      const g = c.createGain();
      env(g, t, 0.02, 0.05 * vol, 0.5);
      o.connect(lp).connect(g).connect(out(1, 0.3));
      o.start(t);
      o.stop(t + 0.6);
      break;
    }
    case 'good': {
      [659.25, 987.77].forEach((f, i) => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = c.createGain();
        env(g, t + i * 0.09, 0.01, 0.1 * vol, 0.6);
        o.connect(g).connect(out(1, 0.5));
        o.start(t + i * 0.09);
        o.stop(t + 0.9);
      });
      break;
    }
    case 'alarm': {
      for (let i = 0; i < 3; i++) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440, t + i * 0.22);
        o.frequency.linearRampToValueAtTime(330, t + i * 0.22 + 0.18);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        const g = c.createGain();
        env(g, t + i * 0.22, 0.01, 0.08 * vol, 0.18);
        o.connect(lp).connect(g).connect(out(1, 0.3));
        o.start(t + i * 0.22);
        o.stop(t + i * 0.22 + 0.22);
      }
      break;
    }
  }
}

/** Low ambient bed: detuned oscillators through a breathing low-pass, plus a sub. */
export function startDrone() {
  if (!enabled || !ctx || !master || drone) return;
  const c = ctx;
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 3);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.Q.value = 2;
  const lfo = c.createOscillator();
  const lfoG = c.createGain();
  lfo.frequency.value = 0.07;
  lfoG.gain.value = 160;
  lfo.connect(lfoG).connect(lp.frequency);
  const oscs = [55, 55.4, 82.4, 41.2].map((f, i) => {
    const o = c.createOscillator();
    o.type = i === 3 ? 'sine' : 'sawtooth';
    o.frequency.value = f;
    o.connect(i === 3 ? g : lp);
    o.start(t);
    return o;
  });
  lp.connect(g).connect(out(1, 0.5));
  lfo.start(t);
  drone = {
    stop: () => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0.0001, now, 0.6);
      [...oscs, lfo].forEach((o) => o.stop(now + 3));
    },
  };
}

export function stopDrone() {
  drone?.stop();
  drone = null;
}

/**
 * The intro film as data. Times are in seconds of *film time*; the world simulation may run slower
 * (bullet time) — see timeScaleAt(). Components read these constants and derive their own state.
 */
import type { CameraPose } from '@/world/stations';

export interface IntroScript {
  kind: 'full' | 'short';
  duration: number;
  /** Phase switches to "site" here (UI assembles) while the film tail finishes. */
  handoff: number;
  /** "YASHRAJ GHEMUD presents" title card. */
  presents: number;
  /** Heartbeats of the cold open. */
  beats: number[];
  burst: number;
  /** The masks swarm into one giant Mask (the antagonist). */
  maskGather: number;
  /** The Mask lunges at the camera… */
  lunge: number;
  /** …cut to black and silence. */
  blackout: number;
  serpents: number;
  /** The dragons breathe fire at the Mask. */
  breathMask: number;
  /** The Mask roars and throws them back. */
  roar: number;
  /** Face-off breath that triggers the fusion. */
  breath: number;
  fusion: number;
  scan: number;
  scanEnd: number;
  /** Climax: the Sentinel laser detonates the Mask. */
  maskBreak: number;
  /** A held breath after the climax. */
  silence: number;
  name: number;
  slice: number;
  dissolve: number;
  /** "DEVELOPED BY YASHRAJ GHEMUD" end-title card. */
  credit: number;
  letterboxOut: number;
  captions: { at: number; until: number; text: string }[];
}

/** VICZO: THE MASK — a 26-second film in three acts. */
export const FULL: IntroScript = {
  kind: 'full',
  duration: 26.5,
  handoff: 25.2,
  presents: 0.35,
  beats: [0.55, 0.77, 1.85, 2.07],
  burst: 3.0,
  maskGather: 5.9,
  lunge: 8.45,
  blackout: 8.95,
  serpents: 9.45,
  breathMask: 13.2,
  roar: 14.25,
  breath: 14.85,
  fusion: 15.5,
  scan: 17.2,
  scanEnd: 19.2,
  maskBreak: 18.2,
  silence: 19.4,
  name: 20.7,
  slice: 21.85,
  dissolve: 23.1,
  credit: 23.3,
  letterboxOut: 24.6,
  captions: [
    { at: 0.9, until: 2.85, text: '3:07 AM. Somewhere, a phone installs an app nobody checked.' },
    { at: 3.5, until: 5.6, text: 'It looked like every other app.' },
    { at: 6.3, until: 8.0, text: 'It wasn’t.' },
    { at: 9.9, until: 12.3, text: 'But two fires were already on their way.' },
    { at: 15.0, until: 16.4, text: 'When they meet —' },
    { at: 17.3, until: 19.0, text: '— nothing stays hidden.' },
  ],
};

const NEVER = -100;

export const SHORT: IntroScript = {
  kind: 'short',
  duration: 3.2,
  handoff: 1.9,
  presents: NEVER,
  beats: [],
  burst: NEVER,
  maskGather: NEVER,
  lunge: NEVER,
  blackout: NEVER,
  serpents: NEVER,
  breathMask: NEVER,
  roar: NEVER,
  breath: NEVER,
  fusion: 0.35,
  scan: NEVER,
  scanEnd: 0.4,
  maskBreak: NEVER,
  silence: NEVER,
  name: NEVER,
  slice: NEVER,
  dissolve: NEVER,
  credit: 0.3,
  letterboxOut: 1.5,
  captions: [],
};

/** Where the antagonist stands: behind the spot where the Core will be born. */
export const MASK_CENTER: [number, number, number] = [0, 0.5, -5];

/** Simulation speed: real bullet time around the fusion and again at the climax. */
export function timeScaleAt(s: IntroScript, t: number): number {
  if (s.kind !== 'full') return 1;
  const dip = (a: number, low: number, hold: number, ramp: number) => {
    if (t < a || t > a + hold + ramp) return 1;
    if (t < a + hold) return low;
    return low + ((t - a - hold) / ramp) * (1 - low);
  };
  return Math.min(dip(s.fusion + 0.04, 0.12, 0.6, 0.5), dip(s.maskBreak + 0.03, 0.18, 0.55, 0.6));
}

export interface Key {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll?: number;
}

/** Camera keys; the last key is replaced at runtime by the hero pose (desktop or mobile). */
export function cameraKeys(s: IntroScript, hero: CameraPose, mobile: boolean): Key[] {
  const titleZ = 5.4; // in front of the orbit rings (max radius ≈ 4.1)
  const m = mobile ? 1.45 : 1; // pull back a little on portrait screens
  if (s.kind === 'short') {
    return [
      { t: 0, pos: [0, 0.4, 6 * m], target: [0, 0, 0], fov: 38 },
      { t: 1.2, pos: [-1.2, 1.2, 10 * m], target: [-0.6, 0.2, 0], fov: 40 },
      { t: 3.2, pos: hero.pos, target: hero.target, fov: hero.fov },
    ];
  }
  return [
    // ACT I — suspense
    { t: 0, pos: [0, 0.04, 3.4], target: [0, 0, 0], fov: 34 },
    { t: 2.85, pos: [0, 0.05, 2.6], target: [0, 0, 0], fov: 31 },
    { t: 3.45, pos: [0.7, 0.7, 9 * m], target: [0, 0, 0], fov: 46 },
    { t: 5.4, pos: [4, 2.4, 25 * m], target: [0, 0, 0], fov: 55 },
    { t: 6.8, pos: [2, 1.2, 19 * m], target: [0, 0.5, -5], fov: 46 },
    // ominous push-in on the Mask…
    { t: 8.35, pos: [0, 0.4, 9.5 * m], target: [0, 0.8, -5], fov: 40 },
    // …it lunges, the camera recoils — then black.
    { t: 8.95, pos: [0, 0.2, 11 * m], target: [0, 0.8, -4], fov: 44, roll: 0.03 },
    // ACT II — out of the dark, the fires arrive
    { t: 9.5, pos: [-12 * m, 2, 15 * m], target: [0, 0.5, -3], fov: 50 },
    { t: 11.2, pos: [-16 * m, 5, 8 * m], target: [-2, 1, -4], fov: 52, roll: -0.05 },
    { t: 12.7, pos: [-5 * m, 9, 12 * m], target: [0, 2, -5], fov: 50, roll: 0.04 },
    { t: 13.8, pos: [7 * m, 1, 13 * m], target: [0, 0.5, -4], fov: 46 },
    { t: 14.6, pos: [0, 0.6, 16 * m], target: [0, 0.5, -2], fov: 44, roll: -0.03 },
    // ACT III — fusion, the Sentinel, the climax
    { t: 15.45, pos: [-10 * m, 1.2, 9 * m], target: [0, 0, 0], fov: 42, roll: 0.02 },
    { t: 16.5, pos: [-7 * m, 3, 13 * m], target: [0, 0.4, -2], fov: 46 },
    { t: 17.6, pos: [0, 1.8, 17 * m], target: [0, 0.5, -4], fov: 48 },
    { t: 18.5, pos: [0, 0.8, 15 * m], target: [0, 0.5, -4], fov: 50 },
    { t: 19.9, pos: [-2 * m, -1.2, 16 * m], target: [0, -0.8, -1], fov: 44 },
    // the name, with a true dolly-zoom (push in, widen FOV: the title holds its size)
    { t: 20.65, pos: [0, 0.2, titleZ + 13.6 * m], target: [0, 0.2, titleZ], fov: 32 },
    { t: 22.95, pos: [0, 0.3, titleZ + 8 * m], target: [0, 0.2, titleZ], fov: 51.6 },
    { t: 24.4, pos: [hero.pos[0] * 0.5, hero.pos[1] + 1.6, hero.pos[2] + 1.2], target: [hero.target[0] * 0.5, hero.target[1] + 0.4, 0], fov: (hero.fov + 51.6) / 2 },
    { t: 26.5, pos: hero.pos, target: hero.target, fov: hero.fov },
  ];
}

type V3 = [number, number, number];

function hermite(p0: number, p1: number, m0: number, m1: number, h: number, s: number) {
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
}

/** Non-uniform Catmull-Rom (C1) through keys; zero tangents at the ends for ease-in/out. */
export function sampleKeys(keys: Key[], t: number): { pos: V3; target: V3; fov: number; roll: number } {
  if (t <= keys[0].t) return { pos: keys[0].pos, target: keys[0].target, fov: keys[0].fov, roll: keys[0].roll ?? 0 };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { pos: last.pos, target: last.target, fov: last.fov, roll: last.roll ?? 0 };
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const h = k1.t - k0.t;
  const s = (t - k0.t) / h;
  const tangent = (get: (k: Key) => number, j: number) => {
    if (j <= 0 || j >= keys.length - 1) return 0;
    return (get(keys[j + 1]) - get(keys[j - 1])) / (keys[j + 1].t - keys[j - 1].t);
  };
  const lerpScalar = (get: (k: Key) => number) => hermite(get(k0), get(k1), tangent(get, i), tangent(get, i + 1), h, s);
  const v3 = (sel: 'pos' | 'target'): V3 => [0, 1, 2].map((c) => lerpScalar((k) => k[sel][c])) as V3;
  return { pos: v3('pos'), target: v3('target'), fov: lerpScalar((k) => k.fov), roll: lerpScalar((k) => k.roll ?? 0) };
}

/** C1 path through timed points (used for the dragons' flight). */
export function samplePath(keys: { t: number; p: V3 }[], t: number, out: V3 = [0, 0, 0]): V3 {
  const asKeys = keys.map((k) => ({ t: k.t, pos: k.p, target: k.p, fov: 0 }));
  const r = sampleKeys(asKeys, t);
  out[0] = r.pos[0];
  out[1] = r.pos[1];
  out[2] = r.pos[2];
  return out;
}

export const easeInCubic = (x: number) => x * x * x;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export function elasticOut(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3.2)) + 1;
}

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
  burst: number;
  serpents: number;
  breath: number;
  fusion: number;
  scan: number;
  scanEnd: number;
  name: number;
  slice: number;
  dissolve: number;
  letterboxOut: number;
  captions: { at: number; until: number; text: string }[];
}

export const FULL: IntroScript = {
  kind: 'full',
  duration: 16.4,
  handoff: 15.0,
  burst: 1.8,
  serpents: 4.6,
  breath: 7.6,
  fusion: 8.4,
  scan: 9.6,
  scanEnd: 11.8,
  name: 12.0,
  slice: 13.15,
  dissolve: 14.4,
  letterboxOut: 14.7,
  captions: [
    { at: 0.35, until: 1.9, text: 'Every day, people install apps from places nobody checks.' },
    { at: 2.3, until: 4.5, text: 'Most are harmless. Some wear a mask.' },
    { at: 8.1, until: 9.5, text: 'When they meet —' },
    { at: 9.9, until: 11.8, text: '— nothing stays hidden.' },
  ],
};

export const SHORT: IntroScript = {
  kind: 'short',
  duration: 3.2,
  handoff: 1.9,
  burst: -10,
  serpents: -10,
  breath: -10,
  fusion: 0.35,
  scan: -10,
  scanEnd: 0.4,
  name: -10,
  slice: -10,
  dissolve: -10,
  letterboxOut: 1.5,
  captions: [],
};

/** Simulation speed: real bullet time around the fusion. */
export function timeScaleAt(s: IntroScript, t: number): number {
  if (s.kind !== 'full') return 1;
  const a = s.fusion + 0.04;
  if (t < a) return 1;
  if (t < a + 0.6) return 0.12;
  if (t < a + 1.1) return 0.12 + ((t - a - 0.6) / 0.5) * 0.88;
  return 1;
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
    { t: 0, pos: [0, 0.04, 3.4], target: [0, 0, 0], fov: 34 },
    { t: 1.75, pos: [0, 0.05, 2.7], target: [0, 0, 0], fov: 31 },
    { t: 2.35, pos: [0.7, 0.7, 9 * m], target: [0, 0, 0], fov: 46 },
    { t: 4.4, pos: [4, 2.4, 26 * m], target: [0, 0, 0], fov: 55 },
    { t: 6.0, pos: [-14 * m, 5, 20 * m], target: [0, 1, 0], fov: 52, roll: -0.06 },
    { t: 7.5, pos: [-17 * m, 1.6, 7 * m], target: [0, 0.4, 0], fov: 46, roll: 0.05 },
    { t: 8.6, pos: [-12 * m, 1.2, 10 * m], target: [0, 0, 0], fov: 42, roll: 0.02 },
    { t: 9.7, pos: [-6 * m, 3.6, 15 * m], target: [0, 0.6, 0], fov: 46 },
    { t: 10.9, pos: [-2 * m, -2.2, 16 * m], target: [0, -2, 0], fov: 44 },
    { t: 11.95, pos: [0, 0.2, titleZ + 13.6 * m], target: [0, 0.2, titleZ], fov: 32 },
    // Dolly-zoom on the name: push in while widening FOV so the title holds its size.
    { t: 14.25, pos: [0, 0.3, titleZ + 8 * m], target: [0, 0.2, titleZ], fov: 51.6 },
    { t: 15.2, pos: [hero.pos[0] * 0.5, hero.pos[1] + 1.6, hero.pos[2] + 1.2], target: [hero.target[0] * 0.5, hero.target[1] + 0.4, 0], fov: (hero.fov + 51.6) / 2 },
    { t: 16.4, pos: hero.pos, target: hero.target, fov: hero.fov },
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

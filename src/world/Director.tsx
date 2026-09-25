import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cameraKeys, FULL, SHORT, sampleKeys, timeScaleAt } from '@/intro/script';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { clock } from './fx';
import { STATIONS, type CameraPose } from './stations';

/** Smooth 1D value noise for handheld camera drift. */
function vnoise(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1;
}

/** Debug hooks (enabled with ?debug) for deterministic capture of the film. */
export const debugHooks: { fixedDt: number | null } = { fixedDt: null };
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search);
  if (q.has('debug')) {
    const f = Number(q.get('fixeddt'));
    debugHooks.fixedDt = Number.isFinite(f) && f > 0 ? f : null;
  }
}

/** Critically damped spring (Unity-style SmoothDamp): eases in and out, never overshoots. */
function smoothDamp(cur: number, target: number, vel: { v: number }, smoothTime: number, dt: number) {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

export function isPortrait(w: number, h: number) {
  return w / h < 0.8 || w < 700;
}

export function poseFor(id: keyof typeof STATIONS, portrait: boolean): CameraPose {
  return portrait ? STATIONS[id].mobile : STATIONS[id].desktop;
}

/**
 * The camera operator. Runs before everything else each frame:
 *  1. advances the clocks (film time, simulation time with bullet time)
 *  2. picks a target pose — film keys during the intro, stations (+scroll path) on the site
 *  3. follows it with critically damped motion, handheld drift, trauma shake and roll
 */
export function Director() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const st = useMemo(
    () => ({
      pos: new THREE.Vector3(0, 0.04, 3.4),
      target: new THREE.Vector3(),
      fov: 34,
      roll: 0,
      wantPos: new THREE.Vector3(),
      wantTarget: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      par: new THREE.Vector2(),
      vel: Array.from({ length: 8 }, () => ({ v: 0 })),
      initialised: false,
    }),
    [],
  );
  const keysRef = useRef<{ kind: string; portrait: boolean; keys: ReturnType<typeof cameraKeys> } | null>(null);

  useFrame((_, delta) => {
    // ?debug&fixeddt=0.033 makes the film deterministic for automated screenshots.
    const dt = debugHooks.fixedDt ?? Math.min(delta, 1 / 20);
    clock.dt = dt;
    clock.t += dt;
    const ex = useExperience.getState();
    const intro = world.intro;
    const portrait = isPortrait(size.width, size.height);
    const script = intro.kind === 'full' ? FULL : SHORT;

    // ── clocks
    if (intro.running) {
      intro.t += dt;
      intro.timeScale = timeScaleAt(script, intro.t);
    } else intro.timeScale = 1;
    clock.simDt = dt * intro.timeScale;
    clock.sim += clock.simDt;

    // ── target pose
    const hero = poseFor('core', portrait);
    let fov: number;
    let roll = 0;
    let smooth: number;
    if (intro.running || ex.phase === 'gate') {
      if (!keysRef.current || keysRef.current.kind !== script.kind || keysRef.current.portrait !== portrait) {
        keysRef.current = { kind: script.kind, portrait, keys: cameraKeys(script, hero, portrait) };
      }
      const k = sampleKeys(keysRef.current.keys, ex.phase === 'gate' ? 0 : intro.t);
      st.wantPos.set(...k.pos);
      st.wantTarget.set(...k.target);
      fov = k.fov;
      roll = k.roll;
      smooth = 0.1;
    } else {
      const path = world.path;
      if (path.active && world.station === 'core') {
        const A = poseFor(path.from, portrait);
        const B = poseFor(path.to, portrait);
        const t = path.t;
        st.wantPos.set(...A.pos).lerp(st.a.set(...B.pos), t);
        st.wantTarget.set(...A.target).lerp(st.b.set(...B.target), t);
        // a gentle arc so moves between chapters feel craned rather than slid
        st.wantPos.x += Math.sin(t * Math.PI) * 2.2;
        st.wantPos.z += Math.sin(t * Math.PI) * 1.5;
        fov = A.fov + (B.fov - A.fov) * t;
      } else {
        const P = poseFor(world.station, portrait);
        st.wantPos.set(...P.pos);
        st.wantTarget.set(...P.target);
        fov = P.fov;
      }
      // pointer parallax
      st.par.x += (world.pointer.x - st.par.x) * Math.min(1, dt * 2.5);
      st.par.y += (world.pointer.y - st.par.y) * Math.min(1, dt * 2.5);
      if (!ex.reducedMotion) {
        st.wantPos.x += st.par.x * 0.55;
        st.wantPos.y += st.par.y * 0.35;
      }
      smooth = 0.85;
    }

    if (!st.initialised) {
      st.pos.copy(st.wantPos);
      st.target.copy(st.wantTarget);
      st.fov = fov;
      st.initialised = true;
    }
    // critically damped follow (frame-rate independent, eases in and out)
    const v = st.vel;
    st.pos.set(smoothDamp(st.pos.x, st.wantPos.x, v[0], smooth, dt), smoothDamp(st.pos.y, st.wantPos.y, v[1], smooth, dt), smoothDamp(st.pos.z, st.wantPos.z, v[2], smooth, dt));
    st.target.set(smoothDamp(st.target.x, st.wantTarget.x, v[3], smooth * 0.9, dt), smoothDamp(st.target.y, st.wantTarget.y, v[4], smooth * 0.9, dt), smoothDamp(st.target.z, st.wantTarget.z, v[5], smooth * 0.9, dt));
    st.fov = smoothDamp(st.fov, fov, v[6], smooth, dt);
    st.roll = smoothDamp(st.roll, roll, v[7], smooth, dt);

    // handheld drift + trauma shake
    world.trauma = Math.max(0, world.trauma - dt * 0.9);
    const shake = ex.reducedMotion ? 0 : world.trauma * world.trauma;
    const hand = ex.reducedMotion ? 0 : intro.running ? 0.035 : 0.018;
    const tt = clock.t;
    cam.position.set(
      st.pos.x + vnoise(tt * 0.5, 1) * hand + vnoise(tt * 22, 4) * shake * 0.45,
      st.pos.y + vnoise(tt * 0.45, 2) * hand + vnoise(tt * 24, 5) * shake * 0.45,
      st.pos.z + vnoise(tt * 0.4, 3) * hand * 0.5,
    );
    cam.lookAt(st.target);
    cam.rotateZ(st.roll + vnoise(tt * 0.3, 7) * hand * 0.12 + vnoise(tt * 20, 8) * shake * 0.04);
    if (Math.abs(cam.fov - st.fov) > 0.01) {
      cam.fov = st.fov;
      cam.updateProjectionMatrix();
    }
  }, -10);

  return null;
}

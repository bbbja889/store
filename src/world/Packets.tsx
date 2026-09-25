import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL, SHORT, range, easeOutExpo, easeInOutCubic } from '@/intro/script';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, mulberry32 } from './fx';
import { emitSparks } from './Sparks';
import { shatter } from './Shards';
import { createTileMaterial, tileAttributes, tileGeometry, tileUniforms } from './tileMaterial';

export const RINGS = [
  { r: 2.55, tilt: new THREE.Euler(1.12, 0, 0.28), w: 0.2 },
  { r: 3.25, tilt: new THREE.Euler(0.3, 0, -0.2), w: -0.14 },
  { r: 4.05, tilt: new THREE.Euler(-0.26, 0, 0.42), w: 0.095 },
];

export function laserY(t: number) {
  const s = FULL;
  return 11 - 22 * easeInOutCubic(range(t, s.scan, s.scanEnd));
}

/** Live film statistics for the HUD (real simulation values, not decoration). */
export const introStats = { packets: 0, masks: 0, integrity: 1 };

export function Packets({ count, ringCounts }: { count: number; ringCounts: [number, number, number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => tileGeometry().clone(), []);
  const mat = useMemo(() => createTileMaterial(), []);

  const data = useMemo(() => {
    const rnd = mulberry32(7);
    const kinds = new Uint8Array(count);
    for (let i = 0; i < count; i++) kinds[i] = rnd() < 0.12 ? 1 : rnd() < 0.09 ? 2 : 0;
    const attrs = tileAttributes(count, 11, (i) => kinds[i]);
    const r = new Float32Array(count);
    const th = new Float32Array(count);
    const h = new Float32Array(count);
    const om = new Float32Array(count);
    const size = new Float32Array(count);
    const delay = new Float32Array(count);
    const axis: THREE.Vector3[] = [];
    const spin = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const rr = 6.5 + Math.pow(rnd(), 0.8) * 20;
      r[i] = rr;
      th[i] = rnd() * Math.PI * 2;
      h[i] = (rnd() * 2 - 1) * (2.5 + rr * 0.42);
      om[i] = 0.22 * Math.pow(9 / rr, 0.9) * (0.8 + rnd() * 0.4);
      size[i] = 0.3 + rnd() * 0.22;
      delay[i] = rnd() * 0.35 + (rr - 6.5) * 0.012;
      axis.push(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize());
      spin[i] = 0.3 + rnd() * 1.2;
    }
    // Orbit slots go to the clean tiles nearest the core.
    const order = [...Array(count).keys()].filter((i) => kinds[i] !== 1).sort((a, b) => r[a] - r[b]);
    const slot = new Int16Array(count).fill(-1);
    const slotRing = new Int8Array(count);
    const slotPhase = new Float32Array(count);
    let k = 0;
    ringCounts.forEach((n, ring) => {
      for (let j = 0; j < n && k < order.length; j++, k++) {
        const i = order[k];
        slot[i] = j;
        slotRing[i] = ring;
        slotPhase[i] = (j / n) * Math.PI * 2 + ring * 0.7;
      }
    });
    return {
      kinds, attrs, r, th, h, om, size, delay, axis, spin, slot, slotRing, slotPhase,
      pos: new Float32Array(count * 3),
      push: new Float32Array(count),
      judgedAt: new Float32Array(count).fill(-1),
      dead: new Uint8Array(count),
      fade: new Float32Array(count).fill(1),
      epoch: world.intro.epoch,
    };
  }, [count, ringCounts]);

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      look: new THREE.Matrix4(),
      ringQ: RINGS.map((rg) => new THREE.Quaternion().setFromEuler(rg.tilt)),
      v: new THREE.Vector3(),
      prevLaser: 12,
      lastPop: 0,
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame((state) => {
    const im = mesh.current;
    if (!im) return;
    tileUniforms.uTime.value = clock.t;
    tileUniforms.uGlitch.value += (world.glitch - tileUniforms.uGlitch.value) * Math.min(1, clock.dt * 4);
    const phase = useExperience.getState().phase;
    const intro = world.intro;
    if (data.epoch !== intro.epoch) {
      // replay: bring every mask back from the dead
      data.epoch = intro.epoch;
      data.judgedAt.fill(-1);
      data.dead.fill(0);
      data.fade.fill(1);
      data.pos.fill(0);
      tmp.prevLaser = 12;
    }
    const s = intro.kind === 'full' ? FULL : SHORT;
    const cinematic = intro.running && s.kind === 'full';
    const t = intro.running ? intro.t : 1e4;
    const sim = clock.sim;
    const dt = clock.simDt;
    const settled = !intro.running;
    const gate = phase === 'gate';
    const cam = state.camera;
    const ly = cinematic ? laserY(t) : -100;
    const laserActive = cinematic && t >= s.scan && t <= s.scanEnd + 0.1;
    const { attrs, kinds } = data;
    const aDyn = attrs.aDyn;
    let visible = 0;

    for (let i = 0; i < count; i++) {
      const d = i * 4;
      if (data.dead[i]) {
        tmp.s.setScalar(0);
        tmp.m.compose(tmp.p.set(0, -1e4, 0), tmp.q.identity(), tmp.s);
        im.setMatrixAt(i, tmp.m);
        continue;
      }
      // expansion from the burst
      let e = 1;
      if (gate && intro.kind === 'full') e = 0;
      else if (cinematic) e = easeOutExpo(range(t, s.burst + data.delay[i], s.burst + data.delay[i] + 1.8));
      const theta = data.th[i] + data.om[i] * sim;
      const rr = data.r[i] * (0.02 + 0.98 * e);
      const sx = Math.cos(theta) * rr;
      const sz = Math.sin(theta) * rr;
      const sy = data.h[i] * e + Math.sin(sim * 0.45 + data.th[i] * 3) * 0.35 * e;

      // judgement
      if (data.judgedAt[i] < 0 && e > 0.5) {
        const shouldJudge = cinematic ? laserActive && tmp.prevLaser >= sy && sy > ly - 0.001 : settled || t > s.fusion + 0.3;
        if (shouldJudge) {
          data.judgedAt[i] = sim;
          if (kinds[i] === 1) {
            if (cinematic) {
              data.dead[i] = 1;
              introStats.masks++;
              tmp.v.set(sx, sy, sz);
              shatter(tmp.v, { count: 7, power: 4.5 });
              emitSparks({ count: 14, origin: tmp.v, color: COLORS.danger, speed: [1.5, 6], life: [0.4, 1.1], intensity: 4 });
              if (clock.t - tmp.lastPop > 0.045) {
                playSfx('pop');
                tmp.lastPop = clock.t;
              }
              continue;
            }
          }
        }
      }
      const judged = data.judgedAt[i] < 0 ? 0 : Math.min(1, (sim - data.judgedAt[i]) / 0.6);
      const isMask = kinds[i] === 1;
      // masks that were not shattered cinematically simply fade away once judged
      if (isMask && data.judgedAt[i] >= 0) {
        data.fade[i] = Math.max(0, data.fade[i] - dt * 1.5);
        if (data.fade[i] <= 0) {
          data.dead[i] = 1;
          continue;
        }
      }
      const inOrbit = data.slot[i] >= 0 && data.judgedAt[i] >= 0;
      const p = tmp.p;
      if (inOrbit) {
        const ring = RINGS[data.slotRing[i]];
        const a = data.slotPhase[i] + ring.w * sim;
        tmp.v.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r).applyQuaternion(tmp.ringQ[data.slotRing[i]]);
        // cursor repulsion (screen space), springs back
        p.copy(tmp.v).project(cam);
        const dx = (p.x - world.pointer.x) * (state.size.width / state.size.height);
        const dy = p.y - world.pointer.y;
        const dist = Math.hypot(dx, dy);
        const want = dist < 0.2 ? (1 - dist / 0.2) * 0.9 : 0;
        data.push[i] += (want - data.push[i]) * Math.min(1, clock.dt * 6);
        tmp.v.multiplyScalar(1 + data.push[i] * 0.25);
        tmp.v.y += data.push[i] * 0.25;
        const k = 1 - Math.exp(-dt * (cinematic ? 2.6 : 3.4));
        const i3 = i * 3;
        if (data.pos[i3] === 0 && data.pos[i3 + 1] === 0 && data.pos[i3 + 2] === 0) data.pos.set([sx, sy, sz], i3);
        data.pos[i3] += (tmp.v.x - data.pos[i3]) * k;
        data.pos[i3 + 1] += (tmp.v.y - data.pos[i3 + 1]) * k;
        data.pos[i3 + 2] += (tmp.v.z - data.pos[i3 + 2]) * k;
        p.set(data.pos[i3], data.pos[i3 + 1], data.pos[i3 + 2]);
        tmp.look.lookAt(cam.position, p, tmp.up);
        tmp.q.setFromRotationMatrix(tmp.look);
        tmp.s.setScalar(0.3 * (1 + data.push[i] * 0.35));
      } else {
        p.set(sx, sy, sz);
        data.pos.set([sx, sy, sz], i * 3);
        tmp.q.setFromAxisAngle(data.axis[i], data.spin[i] * sim + data.th[i]);
        tmp.s.setScalar(data.size[i] * (0.25 + 0.75 * e));
      }
      tmp.m.compose(p, tmp.q, tmp.s);
      im.setMatrixAt(i, tmp.m);

      const highlight = laserActive ? Math.exp(-Math.pow((sy - ly) * 2.2, 2)) * 0.9 : 0;
      const pulse = 0.5 + 0.5 * Math.sin(clock.t * 7 + data.th[i] * 10);
      const glitch = isMask && data.judgedAt[i] < 0 && e > 0.2 ? 0.35 + 0.65 * pulse * pulse : 0;
      // Before the Sentinel sweeps, the noise is colourless. After, everything carries meaning.
      aDyn[d] = glitch;
      aDyn[d + 1] = judged;
      aDyn[d + 2] = (gate && intro.kind === 'full' ? 0 : Math.min(1, e * 3)) * data.fade[i] * (inOrbit ? 1 : 0.92);
      aDyn[d + 3] = highlight;
      if (aDyn[d + 2] > 0.05) visible++;
    }
    tmp.prevLaser = ly;
    introStats.packets = visible;
    im.instanceMatrix.needsUpdate = true;
    (im.geometry.getAttribute('aDyn') as THREE.InstancedBufferAttribute).needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, mat, count]} frustumCulled={false}>
      <instancedBufferAttribute attach="geometry-attributes-aStatic" args={[data.attrs.aStatic, 4]} />
      <instancedBufferAttribute attach="geometry-attributes-aDyn" args={[data.attrs.aDyn, 4]} usage={THREE.DynamicDrawUsage} />
      <instancedBufferAttribute attach="geometry-attributes-aColA" args={[data.attrs.aColA, 3]} />
      <instancedBufferAttribute attach="geometry-attributes-aColB" args={[data.attrs.aColB, 3]} />
    </instancedMesh>
  );
}

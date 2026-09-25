import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL, MASK_CENTER, easeInCubic, easeOutCubic, range } from '@/intro/script';
import { world, addTrauma } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, glowTexture, mulberry32 } from './fx';
import { introStats, laserY } from './Packets';
import { emitSparks } from './Sparks';
import { shatter } from './Shards';
import { createTileMaterial, tileAttributes, tileGeometry } from './tileMaterial';

const W = 400;
const H = 480;
const SCALE = 6.8 / W;

/** The antagonist's silhouette: a cracked theatre-mask skull with menacing eye slits and a jagged grin. */
function sampleMask(count: number, seed: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff';
  // cranium
  g.beginPath();
  g.ellipse(200, 190, 150, 168, 0, 0, Math.PI * 2);
  g.fill();
  // cheeks + jaw
  g.beginPath();
  g.moveTo(58, 230);
  g.quadraticCurveTo(70, 330, 128, 412);
  g.lineTo(162, 452);
  g.lineTo(238, 452);
  g.lineTo(272, 412);
  g.quadraticCurveTo(330, 330, 342, 230);
  g.closePath();
  g.fill();
  // carve: eyes, nose, grin, crack
  g.globalCompositeOperation = 'destination-out';
  const eye = (sx: number) => {
    g.beginPath();
    g.moveTo(200 + sx * 108, 196);
    g.lineTo(200 + sx * 26, 226);
    g.lineTo(200 + sx * 36, 262);
    g.quadraticCurveTo(200 + sx * 84, 272, 200 + sx * 112, 238);
    g.closePath();
    g.fill();
  };
  eye(-1);
  eye(1);
  g.beginPath();
  g.moveTo(200, 282);
  g.lineTo(182, 330);
  g.lineTo(218, 330);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(120, 352);
  for (let i = 0; i <= 10; i++) g.lineTo(120 + i * 16, i % 2 ? 392 : 360);
  g.lineTo(280, 352);
  g.quadraticCurveTo(200, 372, 120, 352);
  g.fill();
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(236, 26);
  g.lineTo(222, 70);
  g.lineTo(248, 104);
  g.lineTo(230, 150);
  g.stroke();
  const data = g.getImageData(0, 0, W, H).data;
  const cand: number[] = [];
  for (let y = 0; y < H; y += 5) for (let x = 0; x < W; x += 5) if (data[(y * W + x) * 4 + 3] > 128) cand.push(x, y);
  const rnd = mulberry32(seed);
  const n = Math.min(count, cand.length / 2);
  // shuffle-pick without replacement so the coverage stays even
  const idx = [...Array(cand.length / 2).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const slots = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const px = cand[idx[i] * 2];
    const py = cand[idx[i] * 2 + 1];
    const nx = (px - 200) / 175;
    const ny = (py - 235) / 230;
    const bulge = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * 1.9;
    slots.set([(px - 200) * SCALE, -(py - 240) * SCALE, bulge + (rnd() - 0.5) * 0.25], i * 3);
  }
  return slots;
}

const EYES: [number, number, number][] = [
  [(-72) * SCALE, -(236 - 240) * SCALE, 1.55],
  [(72) * SCALE, -(236 - 240) * SCALE, 1.55],
];

export function Mask({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Sprite | null)[]>([]);
  const ring = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => tileGeometry().clone(), []);
  const mat = useMemo(() => createTileMaterial(), []);
  const glow = useMemo(() => glowTexture(), []);

  const data = useMemo(() => {
    const slots = sampleMask(count, 13);
    const n = slots.length / 3;
    const rnd = mulberry32(29);
    const start = new Float32Array(n * 3);
    const delay = new Float32Array(n);
    const spin = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = 10 + rnd() * 14;
      const th = rnd() * Math.PI * 2;
      start.set([Math.cos(th) * r, (rnd() - 0.5) * 14, Math.sin(th) * r], i * 3);
      // gather from the outside in: bottom and edges arrive last
      delay[i] = rnd() * 0.9 + Math.max(0, -slots[i * 3 + 1]) * 0.05;
      spin[i] = rnd() * 6;
    }
    return { n, slots, start, delay, spin, attrs: tileAttributes(n, 37, () => 1), broken: new Uint8Array(n), epoch: -1, detonated: false, roared: false, growled: false, lunged: false };
  }, [count]);

  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: 1 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uP; varying vec2 vUv;
          void main(){
            float r = length(vUv);
            float ring = exp(-pow((r - 0.8) * 18.0, 2.0));
            vec3 c = vec3(1.0, 0.12, 0.2) * ring * 3.0 * (1.0 - uP);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), qa: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), look: new THREE.Matrix4(), up: new THREE.Vector3(0, 1, 0), w: new THREE.Vector3(), e: new THREE.Euler() }), []);

  const breakTile = (i: number, power: number, pieces: number) => {
    data.broken[i] = 1;
    shatter(tmp.w, { count: pieces, power, color: COLORS.danger });
  };

  useFrame(({ camera }) => {
    const im = mesh.current;
    const g = group.current;
    if (!im || !g) return;
    const intro = world.intro;
    const s = FULL;
    const t = intro.t;
    const on = intro.running && intro.kind === 'full' && t > s.maskGather - 0.1 && t < s.maskBreak + 0.6 && !data.detonated;
    g.visible = on;
    im.visible = on;
    if (data.epoch !== intro.epoch) {
      data.epoch = intro.epoch;
      data.broken.fill(0);
      data.detonated = data.roared = data.growled = data.lunged = false;
    }
    if (!on) return;

    // Lunge toward the camera, then (hidden by the blackout) back to its place.
    const lunge = t < s.blackout + 0.2 ? easeInCubic(range(t, s.lunge, s.blackout)) : 0;
    const breathe = 1 + 0.025 * Math.sin(clock.t * 2.1) + lunge * 0.3;
    g.position.set(MASK_CENTER[0], MASK_CENTER[1] + Math.sin(clock.t * 0.9) * 0.12, MASK_CENTER[2] + lunge * 8.5);
    g.scale.setScalar(breathe);
    g.rotation.y = Math.sin(clock.t * 0.35) * 0.12;

    if (!data.growled && t >= s.lunge - 0.35) {
      data.growled = true;
      playSfx('growl');
    }
    if (!data.lunged && t >= s.blackout - 0.08) {
      data.lunged = true;
      addTrauma(0.7);
      playSfx('impact', { gain: 0.7 });
    }

    // Battle: tiles burn off where the dragons' fire hits.
    const burning = t >= s.breathMask && t < s.breathMask + 0.9;
    let alive = 0;
    const ly = t >= s.scan ? laserY(t) : 99;
    const aDyn = data.attrs.aDyn;
    for (let i = 0; i < data.n; i++) {
      const d = i * 4;
      if (data.broken[i]) {
        tmp.m.compose(tmp.p.set(0, -1e4, 0), tmp.q.identity(), tmp.s.setScalar(0));
        im.setMatrixAt(i, tmp.m);
        aDyn[d + 2] = 0;
        continue;
      }
      alive++;
      const gp = easeOutCubic(range(t, s.maskGather + data.delay[i], s.maskGather + data.delay[i] + 1.3));
      const sx = data.slots[i * 3];
      const sy = data.slots[i * 3 + 1];
      const sz = data.slots[i * 3 + 2];
      // local slot → world, then blend from the swarm start
      tmp.w.set(sx, sy, sz).multiplyScalar(breathe).applyEuler(g.rotation).add(g.position);
      const k = 1 - gp;
      tmp.p.set(
        data.start[i * 3] * k + tmp.w.x * gp + Math.sin(clock.t * 2 + data.spin[i]) * k * 1.5,
        data.start[i * 3 + 1] * k + tmp.w.y * gp,
        data.start[i * 3 + 2] * k + tmp.w.z * gp,
      );
      tmp.w.copy(tmp.p);
      // Ember burns the left cheek, Tide the right: edge tiles peel away (rate is per second, not per frame).
      if (burning && Math.abs(sx) > 1.3 && Math.random() < 1 - Math.exp(-0.75 * clock.dt)) {
        breakTile(i, 3.5, 2);
        if (Math.random() < 0.25) playSfx('pop');
        continue;
      }
      tmp.look.lookAt(camera.position, tmp.p, tmp.up);
      tmp.q.setFromRotationMatrix(tmp.look);
      tmp.e.set(Math.sin(clock.t * 3 + data.spin[i]) * 0.25 * (0.4 + k), Math.cos(clock.t * 2.4 + data.spin[i]) * 0.25 * (0.4 + k), data.spin[i] * k * 3);
      tmp.qa.setFromEuler(tmp.e);
      tmp.q.multiply(tmp.qa);
      tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(0.36 * (0.35 + 0.65 * gp)));
      im.setMatrixAt(i, tmp.m);
      const pulse = 0.5 + 0.5 * Math.sin(clock.t * 9 + data.spin[i] * 5);
      aDyn[d] = 0.55 + 0.45 * pulse + lunge;
      aDyn[d + 1] = 0;
      aDyn[d + 2] = Math.min(1, gp * 4);
      aDyn[d + 3] = (burning && Math.abs(sx) > 1 ? 0.25 * pulse : 0) + Math.exp(-Math.pow((tmp.p.y - ly) * 2.5, 2)) * 1.2;
    }
    introStats.integrity = data.n ? alive / data.n : 0;
    im.instanceMatrix.needsUpdate = true;
    (im.geometry.getAttribute('aDyn') as THREE.InstancedBufferAttribute).needsUpdate = true;

    // The roar: a red shockwave that throws the dragons back.
    if (!data.roared && t >= s.roar) {
      data.roared = true;
      addTrauma(0.5);
      playSfx('growl', { gain: 1.2 });
      emitSparks({ count: 260, origin: g.position, color: COLORS.danger, speed: [4, 16], life: [0.5, 1.4], intensity: 5, gravity: 0, drag: 1.1 });
    }
    if (ring.current) {
      const p = range(t, s.roar, s.roar + 1.2);
      ring.current.visible = p > 0 && p < 1;
      ring.current.position.copy(g.position);
      ring.current.quaternion.copy(camera.quaternion);
      ring.current.scale.setScalar(1 + Math.pow(p, 0.6) * 26);
      ringMat.uniforms.uP.value = p;
    }

    // Eyes: slow burn, flaring on the lunge and the roar.
    const flare = lunge * 3 + Math.exp(-Math.pow((t - s.roar) * 4, 2)) * 3;
    eyes.current.forEach((e, j) => {
      if (!e) return;
      e.visible = on && t > s.maskGather + 1.2;
      e.position.set(EYES[j][0], EYES[j][1], EYES[j][2]);
      const b = (0.8 + 0.4 * Math.sin(clock.t * 6 + j)) * (1 + flare);
      e.scale.setScalar(0.9 + flare * 0.5);
      (e.material as THREE.SpriteMaterial).color.setRGB(5 * b, 0.35 * b, 0.5 * b);
    });

    // CLIMAX — the Sentinel laser detonates the Mask.
    if (!data.detonated && t >= s.maskBreak) {
      data.detonated = true;
      addTrauma(1);
      playSfx('boom');
      let budget = 1300;
      for (let i = 0; i < data.n; i++) {
        if (data.broken[i]) continue;
        const e = new THREE.Vector3();
        im.getMatrixAt(i, tmp.m);
        e.setFromMatrixPosition(tmp.m);
        tmp.w.copy(e);
        const pieces = budget > 0 ? 3 : 0;
        budget -= pieces;
        if (pieces) shatter(tmp.w, { count: pieces, power: 9, color: i % 3 ? COLORS.danger : COLORS.emberLight });
        data.broken[i] = 1;
      }
      emitSparks({ count: 900, origin: g.position, color: COLORS.danger, speed: [4, 26], life: [0.8, 2.4], intensity: 6, drag: 0.8, gravity: -1, size: [0.06, 0.22] });
      emitSparks({ count: 600, origin: g.position, color: COLORS.white, speed: [6, 30], life: [0.4, 1.4], intensity: 6, drag: 1, gravity: 0 });
      introStats.integrity = 0;
      introStats.masks += data.n;
    }
  });

  return (
    <>
      <group ref={group}>
        {[0, 1].map((j) => (
          <sprite key={j} ref={(e) => void (eyes.current[j] = e)} visible={false}>
            <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} transparent />
          </sprite>
        ))}
      </group>
      <instancedMesh ref={mesh} args={[geo, mat, data.n]} frustumCulled={false}>
        <instancedBufferAttribute attach="geometry-attributes-aStatic" args={[data.attrs.aStatic, 4]} />
        <instancedBufferAttribute attach="geometry-attributes-aDyn" args={[data.attrs.aDyn, 4]} usage={THREE.DynamicDrawUsage} />
        <instancedBufferAttribute attach="geometry-attributes-aColA" args={[data.attrs.aColA, 3]} />
        <instancedBufferAttribute attach="geometry-attributes-aColB" args={[data.attrs.aColB, 3]} />
      </instancedMesh>
      <mesh ref={ring} material={ringMat} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}

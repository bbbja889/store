import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL, range, easeInOutCubic } from '@/intro/script';
import { world } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, glowTexture } from './fx';
import { emitSparks } from './Sparks';

const N = 120; // body points
const LENGTH = 15;
const HIST = 900;

/** Screen-projected head positions, read by the intro HUD labels. */
export const serpentHeads = {
  ember: new THREE.Vector3(),
  tide: new THREE.Vector3(),
  /** Normalised device coordinates of each head, for DOM labels. */
  emberNdc: new THREE.Vector3(),
  tideNdc: new THREE.Vector3(),
  visible: 0,
};

function headPosition(sign: 1 | -1, t: number, out: THREE.Vector3) {
  const s = FULL;
  const u = range(t, s.serpents, s.breath);
  const thetaEnd = sign === 1 ? Math.PI : 0;
  const theta = thetaEnd - (1 - u) * 2.6 * Math.PI;
  const R = 5 + 17 * Math.pow(1 - u, 1.3);
  const y = sign * -6.5 * (1 - u) + 1.3 * Math.sin(u * 9 + (sign === 1 ? 0 : 1.7)) * (1 - u);
  out.set(Math.cos(theta) * R, y, Math.sin(theta) * R);
  // Breath: turn head-to-head and hold
  const b = easeInOutCubic(range(t, s.breath, s.fusion - 0.05));
  if (b > 0) out.lerp(new THREE.Vector3(sign === 1 ? -4.2 : 4.2, sign * 0.25, 0.3), b);
  return out;
}

const ribbonMaterial = (head: THREE.Color, body: THREE.Color, tail: THREE.Color) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uHead: { value: head }, uBody: { value: body }, uTail: { value: tail }, uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aS; attribute float aSide;
      varying float vS; varying float vSide;
      void main(){ vS = aS; vSide = aSide; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHead; uniform vec3 uBody; uniform vec3 uTail; uniform float uTime; uniform float uAlpha;
      varying float vS; varying float vSide;
      void main(){
        float core = exp(-pow(vSide * 2.4, 2.0));
        float edge = 1.0 - abs(vSide);
        float scales = 0.7 + 0.3 * step(0.45, fract(vS * 46.0 - uTime * 2.5));
        float spine = exp(-pow(vSide * 9.0, 2.0)) * 0.8;
        vec3 c = mix(uHead, uBody, smoothstep(0.0, 0.14, vS));
        c = mix(c, uTail, smoothstep(0.45, 1.0, vS));
        float a = smoothstep(0.0, 0.3, edge) * (1.0 - smoothstep(0.7, 1.0, vS)) * uAlpha;
        vec3 col = c * (0.35 + 1.9 * core * scales + spine) * a;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

const wingMaterial = (color: THREE.Color) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: color }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec3 aBary; varying vec3 vB; void main(){ vB = aBary; gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; varying vec3 vB;
      void main(){
        float bones = exp(-vB.y * 30.0) + exp(-vB.z * 30.0);
        float trailing = exp(-vB.x * 16.0) * 0.6;
        float membrane = 0.08;
        vec3 c = uColor * (bones * 2.2 + trailing + membrane) * uAlpha;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

const BONES = [
  { a: 0.12, l: 2.1 },
  { a: 0.55, l: 2.5 },
  { a: 0.98, l: 2.1 },
  { a: 1.4, l: 1.4 },
];

function Serpent({ sign }: { sign: 1 | -1 }) {
  const isEmber = sign === 1;
  const base = isEmber ? COLORS.ember : COLORS.tide;
  const light = isEmber ? COLORS.emberLight : COLORS.tideLight;
  const ribbon = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 2 * 3);
    const aS = new Float32Array(N * 2);
    const aSide = new Float32Array(N * 2);
    const idx: number[] = [];
    for (let i = 0; i < N; i++) {
      aS[i * 2] = aS[i * 2 + 1] = i / (N - 1);
      aSide[i * 2] = -1;
      aSide[i * 2 + 1] = 1;
      if (i < N - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, []);
  const wings = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = 2 * (BONES.length - 1) * 3;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const bary = new Float32Array(verts * 3);
    for (let v = 0; v < verts; v++) bary.set(v % 3 === 0 ? [1, 0, 0] : v % 3 === 1 ? [0, 1, 0] : [0, 0, 1], v * 3);
    g.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, []);
  const rMat = useMemo(
    () => ribbonMaterial(new THREE.Color(4, 3.6, 3.2), base.clone().multiplyScalar(2.2), base.clone().multiplyScalar(0.35)),
    [base],
  );
  const wMat = useMemo(() => wingMaterial(light.clone().multiplyScalar(1.4)), [light]);
  const head = useRef<THREE.Sprite>(null);
  const glow = useMemo(() => glowTexture(), []);
  const st = useMemo(
    () => ({
      hist: new Float32Array(HIST * 3),
      count: 0,
      p: new THREE.Vector3(),
      last: new THREE.Vector3(1e9, 0, 0),
      pts: Array.from({ length: N }, () => new THREE.Vector3()),
      tmp: new THREE.Vector3(),
      side: new THREE.Vector3(),
      view: new THREE.Vector3(),
      f: new THREE.Vector3(),
      r: new THREE.Vector3(),
      u: new THREE.Vector3(),
      lastT: -1,
    }),
    [],
  );

  useFrame(({ camera }) => {
    const intro = world.intro;
    const s = FULL;
    const t = intro.t;
    const on = intro.running && intro.kind === 'full' && t >= s.serpents - 0.05 && t < s.fusion + 1.4;
    const mesh = head.current?.parent;
    if (mesh) mesh.visible = on;
    if (!on) {
      st.count = 0;
      st.last.set(1e9, 0, 0);
      if (isEmber) serpentHeads.visible = 0;
      return;
    }
    if (t < st.lastT) st.count = 0;
    st.lastT = t;
    const dying = range(t, s.fusion, s.fusion + 0.9);
    headPosition(sign, Math.min(t, s.fusion), st.p);

    // record history (arc-length friendly: only when moved)
    if (st.p.distanceTo(st.last) > 0.04) {
      const i = st.count % HIST;
      st.hist.set([st.p.x, st.p.y, st.p.z], i * 3);
      st.count++;
      st.last.copy(st.p);
    }
    // walk back along history for evenly spaced body points
    const spacing = LENGTH / (N - 1);
    let k = st.count - 1;
    let carry = 0;
    st.pts[0].copy(st.p);
    let prev = st.p.clone();
    let filled = 1;
    while (filled < N && k >= 0 && k > st.count - HIST) {
      const j = ((k % HIST) + HIST) % HIST;
      st.tmp.set(st.hist[j * 3], st.hist[j * 3 + 1], st.hist[j * 3 + 2]);
      let seg = prev.distanceTo(st.tmp);
      while (seg + carry >= spacing && filled < N) {
        const need = spacing - carry;
        const dir = st.tmp.clone().sub(prev).normalize();
        prev = prev.clone().addScaledVector(dir, need);
        st.pts[filled++].copy(prev);
        seg = prev.distanceTo(st.tmp);
        carry = 0;
      }
      carry += seg;
      prev = st.tmp.clone();
      k--;
    }
    for (let i = filled; i < N; i++) st.pts[i].copy(st.pts[filled - 1]);

    // ribbon vertices
    const pos = ribbon.attributes.position.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const a = st.pts[Math.max(0, i - 1)];
      const b = st.pts[Math.min(N - 1, i + 1)];
      st.f.subVectors(a, b);
      if (st.f.lengthSq() < 1e-8) st.f.set(1, 0, 0);
      st.f.normalize();
      st.view.subVectors(camera.position, st.pts[i]).normalize();
      st.side.crossVectors(st.f, st.view).normalize();
      const sN = i / (N - 1);
      const tip = i < 5 ? 0.45 + (i / 5) * 0.55 : 1;
      const w = 0.62 * Math.pow(1 - sN, 0.85) * tip * (1 + 0.12 * Math.sin(sN * 30 - clock.t * 8)) * (1 - dying);
      const p = st.pts[i];
      pos.set([p.x - st.side.x * w, p.y - st.side.y * w, p.z - st.side.z * w, p.x + st.side.x * w, p.y + st.side.y * w, p.z + st.side.z * w], i * 6);
    }
    ribbon.attributes.position.needsUpdate = true;
    rMat.uniforms.uTime.value = clock.t;
    rMat.uniforms.uAlpha.value = Math.min(1, range(t, s.serpents, s.serpents + 0.5)) * (1 - dying);

    // wings at the shoulder
    const shoulder = st.pts[9];
    st.f.subVectors(st.pts[6], st.pts[12]).normalize();
    st.r.crossVectors(st.f, new THREE.Vector3(0, 1, 0)).normalize();
    st.u.crossVectors(st.r, st.f).normalize();
    const flap = 0.75 * Math.sin(clock.t * 6.5 + (isEmber ? 0 : 1.3)) + 0.2;
    const wp = wings.attributes.position.array as Float32Array;
    let o = 0;
    for (const side of [1, -1]) {
      const tips = BONES.map((bn) => {
        const rs = st.r.clone().multiplyScalar(side * Math.cos(flap)).addScaledVector(st.u, Math.sin(flap));
        return shoulder
          .clone()
          .addScaledVector(rs, Math.cos(bn.a) * bn.l * (1 - dying))
          .addScaledVector(st.f, -Math.sin(bn.a) * bn.l * (1 - dying));
      });
      for (let j = 0; j < BONES.length - 1; j++) {
        wp.set([shoulder.x, shoulder.y, shoulder.z, tips[j].x, tips[j].y, tips[j].z, tips[j + 1].x, tips[j + 1].y, tips[j + 1].z], o);
        o += 9;
      }
    }
    wings.attributes.position.needsUpdate = true;
    wMat.uniforms.uAlpha.value = rMat.uniforms.uAlpha.value;

    // head glow + trail sparks + breath
    if (head.current) {
      head.current.position.copy(st.p);
      head.current.scale.setScalar((1.6 + 0.25 * Math.sin(clock.t * 12)) * (1 - dying));
    }
    const color = isEmber ? COLORS.emberLight : COLORS.tideLight;
    if (t < s.fusion && Math.random() < 0.9) {
      emitSparks({ count: 2, origin: st.p, color, speed: [0.3, 1.6], life: [0.4, 1.0], intensity: 3, gravity: -0.4, size: [0.04, 0.1] });
    }
    if (t >= s.breath && t < s.fusion) {
      const dir = st.p.clone().multiplyScalar(-1).normalize();
      emitSparks({ count: 16, origin: st.p, color: isEmber ? COLORS.ember : COLORS.tide, direction: [dir.x, dir.y, dir.z], spread: 0.22, speed: [7, 14], life: [0.25, 0.55], intensity: 5, gravity: 0, drag: 0.6, size: [0.08, 0.22] });
    }
    if (isEmber) {
      serpentHeads.ember.copy(st.p);
      serpentHeads.emberNdc.copy(st.p).project(camera);
      serpentHeads.visible = (1 - dying) * range(t, s.serpents + 0.4, s.serpents + 1.0);
    } else {
      serpentHeads.tide.copy(st.p);
      serpentHeads.tideNdc.copy(st.p).project(camera);
    }
  });

  return (
    <group>
      <mesh geometry={ribbon} material={rMat} frustumCulled={false} renderOrder={4} />
      <mesh geometry={wings} material={wMat} frustumCulled={false} renderOrder={4} />
      <sprite ref={head}>
        <spriteMaterial map={glow} color={light.clone().multiplyScalar(4)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} transparent />
      </sprite>
    </group>
  );
}

export function Serpents() {
  const cue = useRef({ riser: false, swell: false, lastT: -1 });
  useFrame(() => {
    const intro = world.intro;
    if (!intro.running || intro.kind !== 'full') return;
    const c = cue.current;
    if (intro.t < c.lastT) c.riser = c.swell = false;
    c.lastT = intro.t;
    if (!c.riser && intro.t >= FULL.serpents) {
      c.riser = true;
      playSfx('riserEmber');
      playSfx('riserTide');
    }
    if (!c.swell && intro.t >= FULL.breath) {
      c.swell = true;
      playSfx('swell');
    }
  });
  return (
    <>
      <Serpent sign={1} />
      <Serpent sign={-1} />
    </>
  );
}

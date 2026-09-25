import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { world } from '@/state/world';
import type { Composition } from '@/sentinel/types';
import { clock, COLORS } from '../fx';
import { emitSparks } from '../Sparks';
import { ANCHORS } from '../stations';

export const LAYERS: { key: keyof Composition; label: string; color: string }[] = [
  { key: 'manifest', label: 'Manifest', color: '#ffffff' },
  { key: 'signatures', label: 'Signatures', color: '#ffc24a' },
  { key: 'dex', label: 'Code (DEX)', color: '#ff6b2c' },
  { key: 'native', label: 'Native libs', color: '#9b7bff' },
  { key: 'resources', label: 'Resources', color: '#29d3ff' },
  { key: 'assets', label: 'Assets', color: '#3cf2a0' },
  { key: 'other', label: 'Other', color: '#7c746c' },
];

const VERDICT_COLOR = { clean: COLORS.safe, caution: new THREE.Color('#ffc24a'), danger: COLORS.danger };

export function Lab() {
  const [ax, ay, az] = ANCHORS.lab;
  const pkg = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Mesh | null)[]>([]);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const orb = useRef<THREE.Mesh>(null);
  const glassMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#8fe9ff') }, uScan: { value: 0 } },
        vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uColor; uniform float uScan; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
          void main(){
            vec3 V = normalize(cameraPosition - vW);
            float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
            float lines = step(0.985, fract(vUv.x * 36.0)) * 0.25;
            float band = exp(-pow((vUv.y - fract(uTime * 0.35)) * 12.0, 2.0)) * uScan;
            vec3 c = uColor * (f * 0.55 + lines * 0.4 + band * 1.2);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#121017', metalness: 0.92, roughness: 0.3 }), []);
  const rimMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#29d3ff').multiplyScalar(2.2), toneMapped: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a5c').multiplyScalar(2.6), toneMapped: false, transparent: true }), []);
  const slabMats = useMemo(
    () => LAYERS.map((l) => new THREE.MeshPhysicalMaterial({ color: l.color, emissive: new THREE.Color(l.color), emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 })),
    [],
  );
  const orbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), toneMapped: false, transparent: true, opacity: 0 }), []);
  const st = useMemo(() => ({ y: 3.2, vy: 0, wasActive: false, landed: false, explode: 0, verdictSeen: '' as string }), []);

  useFrame(() => {
    const group = pkg.current?.parent;
    if (!group?.visible) return;
    const scan = world.scan;
    const dt = Math.min(clock.dt, 1 / 30);
    glassMat.uniforms.uTime.value = clock.t;
    glassMat.uniforms.uScan.value += ((scan.active && !scan.verdict ? 1 : 0.15) - glassMat.uniforms.uScan.value) * dt * 3;

    // New scan: drop the package from above with gravity and a bounce.
    if (scan.active && !st.wasActive) {
      st.y = 5.5;
      st.vy = 0;
      st.landed = false;
      st.verdictSeen = '';
    }
    st.wasActive = scan.active;
    const rest = 1.25;
    if (scan.active) {
      st.vy -= 18 * dt;
      st.y += st.vy * dt;
      if (st.y < rest) {
        st.y = rest;
        if (Math.abs(st.vy) > 1.2) {
          emitSparks({ count: 24, origin: [ax, ay + 0.3, az], color: COLORS.tideLight, speed: [1, 4], life: [0.3, 0.8], intensity: 3, gravity: -4 });
          world.trauma = Math.min(1, world.trauma + 0.12);
        }
        st.vy = -st.vy * 0.38;
        if (Math.abs(st.vy) < 0.4) {
          st.vy = 0;
          st.landed = true;
        }
      }
    } else {
      st.y += (rest + 0.35 + Math.sin(clock.t * 1.1) * 0.12 - st.y) * dt * 2;
    }
    const target = scan.composition && scan.active ? scan.explode : 0;
    st.explode += (target - st.explode) * dt * 2.2;

    if (pkg.current) {
      pkg.current.position.set(0, st.y, 0);
      pkg.current.rotation.y += dt * (scan.active && !scan.verdict ? 1.4 : 0.35);
      pkg.current.rotation.x = Math.sin(clock.t * 0.7) * 0.08 * (1 - st.explode);
    }

    // Slabs: stacked cube → exploded view sized by real composition bytes.
    const comp = scan.composition;
    const total = comp ? Object.values(comp).reduce((a, b) => a + b, 0) || 1 : 1;
    let yCursor = -0.8;
    const heights = LAYERS.map((l) => (comp ? Math.max(0.05, (comp[l.key] / total) * 1.6) : 1.6 / LAYERS.length));
    const gap = st.explode * 0.55;
    const stackH = heights.reduce((a, b) => a + b, 0) + gap * (LAYERS.length - 1);
    yCursor = -stackH / 2;
    LAYERS.forEach((_, i) => {
      const m = slabs.current[i];
      if (!m) return;
      const h = heights[i];
      m.scale.set(1.6 + st.explode * 0.5, h, 1.6 + st.explode * 0.5);
      m.position.y = yCursor + h / 2;
      m.rotation.y = st.explode * (i - 3) * 0.12;
      yCursor += h + gap;
      const mat = slabMats[i];
      mat.opacity = comp && comp[LAYERS[i].key] === 0 && st.explode > 0.2 ? 0.15 : 0.9;
      mat.emissiveIntensity = 0.3 + (scan.active && !scan.verdict ? 0.5 + 0.5 * Math.sin(clock.t * 8 + i) : 0.2);
    });

    // Scan rings sweep while analysing
    const sweeping = scan.active && !scan.verdict;
    [ringA.current, ringB.current].forEach((r, i) => {
      if (!r) return;
      r.visible = sweeping || st.explode < 0.1;
      const ph = (clock.t * 0.7 + i * 0.5) % 1;
      r.position.y = 0.2 + (sweeping ? Math.abs(Math.sin(ph * Math.PI)) * 3.2 : 0.3 + i * 0.1);
      (r.material as THREE.MeshBasicMaterial).opacity = sweeping ? 1 : 0.35;
    });

    // Verdict orb + colour
    const v = scan.verdict;
    if (v && st.verdictSeen !== v) {
      st.verdictSeen = v;
      const c = VERDICT_COLOR[v];
      emitSparks({ count: v === 'danger' ? 220 : 120, origin: [ax, ay + st.y, az], color: c, speed: [2, 9], life: [0.6, 1.6], intensity: 4, gravity: v === 'danger' ? -3 : 0.5 });
      if (v === 'danger') world.trauma = Math.min(1, world.trauma + 0.45);
    }
    if (orb.current) {
      const c = v ? VERDICT_COLOR[v] : COLORS.tideLight;
      orbMat.color.setRGB(c.r * 3, c.g * 3, c.b * 3);
      orbMat.opacity += ((v ? 0.9 : 0) - orbMat.opacity) * dt * 3;
      orb.current.position.y = st.y + 1.9 + st.explode * 0.9;
      orb.current.scale.setScalar(0.22 + 0.04 * Math.sin(clock.t * 4));
    }
    rimMat.color.set(v ? VERDICT_COLOR[v] : COLORS.tide).multiplyScalar(2.2);
    glassMat.uniforms.uColor.value.copy(v ? VERDICT_COLOR[v] : COLORS.tideLight);
  });

  return (
    <group position={[ax, ay, az]}>
      <mesh material={baseMat} position={[0, -0.15, 0]}>
        <cylinderGeometry args={[3.1, 3.4, 0.3, 64]} />
      </mesh>
      <mesh material={rimMat} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.72, 2.8, 128]} />
      </mesh>
      <mesh material={glassMat} position={[0, 3, 0]}>
        <cylinderGeometry args={[2.75, 2.75, 6, 64, 1, true]} />
      </mesh>
      <mesh ref={ringA} material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.62, 0.02, 8, 160]} />
      </mesh>
      <mesh ref={ringB} material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.015, 8, 160]} />
      </mesh>
      <group ref={pkg}>
        {LAYERS.map((l, i) => (
          <mesh key={l.key} ref={(m) => void (slabs.current[i] = m)} material={slabMats[i]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        ))}
      </group>
      <mesh ref={orb} material={orbMat}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
    </group>
  );
}

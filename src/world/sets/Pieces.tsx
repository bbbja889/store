import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, fogUniforms, GLSL_NOISE } from '../fx';
import { emitSparks } from '../Sparks';
import { createTileMaterial, tileAttributes, tileGeometry } from '../tileMaterial';
import { ANCHORS } from '../stations';

/* ───────────────────────── Passport: holographic projector */
export function Pedestal() {
  const [x, y, z] = ANCHORS.passport;
  const cone = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying vec2 vUv;
          void main(){
            float h = vUv.y;
            float bands = 0.6 + 0.4 * sin(h * 60.0 - uTime * 4.0);
            float streak = pow(abs(sin(vUv.x * 40.0 + uTime * 0.5)), 30.0);
            vec3 c = mix(vec3(0.16, 0.8, 1.0), vec3(0.6, 0.48, 1.0), h) * (0.12 * bands + streak * 0.25) * (1.0 - h) * smoothstep(0.0, 0.05, h);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  const disc = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f0d15', metalness: 0.9, roughness: 0.3 }), []);
  const root = useRef<THREE.Group>(null);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fe9ff').multiplyScalar(2), toneMapped: false }), []);
  useFrame(() => {
    if (!root.current?.parent?.visible) return;
    cone.uniforms.uTime.value = clock.t;
    if (Math.random() < 0.25) emitSparks({ count: 1, origin: [x + (Math.random() - 0.5) * 4, y - 2.6, z + (Math.random() - 0.5) * 2], velocity: [0, 1.4, 0], speed: [0, 0.2], color: COLORS.tideLight, life: [1.5, 3], intensity: 2, gravity: 0.2, drag: 0.2, size: [0.03, 0.06] });
  });
  return (
    <group ref={root} position={[x, y - 2.9, z]}>
      <mesh material={disc}>
        <cylinderGeometry args={[3.2, 3.5, 0.3, 64]} />
      </mesh>
      <mesh material={rim} position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.9, 2.96, 128]} />
      </mesh>
      <mesh material={cone} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[3.6, 2.9, 6.2, 64, 1, true]} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Vault: a calm, ordered library wall of verified tiles */
export function VaultWall() {
  const COLS = 17;
  const ROWS = 7;
  const COUNT = COLS * ROWS;
  const [ax, ay, az] = ANCHORS.vault;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => tileGeometry().clone(), []);
  const mat = useMemo(() => createTileMaterial(), []);
  const attrs = useMemo(() => tileAttributes(COUNT, 31, () => 0), [COUNT]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), e: new THREE.Euler() }), []);
  useFrame(() => {
    const im = mesh.current;
    if (!im || !im.parent?.visible) return;
    for (let i = 0; i < COUNT; i++) {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const a = ((c - (COLS - 1) / 2) / COLS) * 1.9;
      const R = 18;
      const bob = Math.sin(clock.t * 0.7 + i * 1.3) * 0.12;
      tmp.p.set(Math.sin(a) * R, (r - (ROWS - 1) / 2) * 1.55 + bob, -Math.cos(a) * R + R);
      tmp.e.set(Math.sin(clock.t * 0.5 + i) * 0.06, -a, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(1.05));
      im.setMatrixAt(i, tmp.m);
      const d = i * 4;
      const wave = Math.exp(-Math.pow(((clock.t * 2.2) % 26) - 4 - c - r * 0.5, 2) * 0.5);
      attrs.aDyn[d] = 0;
      attrs.aDyn[d + 1] = 1;
      attrs.aDyn[d + 2] = 1;
      attrs.aDyn[d + 3] = wave * 0.35;
    }
    im.instanceMatrix.needsUpdate = true;
    (im.geometry.getAttribute('aDyn') as THREE.InstancedBufferAttribute).needsUpdate = true;
  });
  return (
    <group position={[ax, ay + 1, az - 30]} scale={1.35}>
      <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false}>
        <instancedBufferAttribute attach="geometry-attributes-aStatic" args={[attrs.aStatic, 4]} />
        <instancedBufferAttribute attach="geometry-attributes-aDyn" args={[attrs.aDyn, 4]} usage={THREE.DynamicDrawUsage} />
        <instancedBufferAttribute attach="geometry-attributes-aColA" args={[attrs.aColA, 3]} />
        <instancedBufferAttribute attach="geometry-attributes-aColB" args={[attrs.aColB, 3]} />
      </instancedMesh>
    </group>
  );
}

/* ───────────────────────── Forge: anvil ring, a tile being forged, hammer strikes */
export function Forge() {
  const [x, y, z] = ANCHORS.forge;
  const tile = useRef<THREE.Mesh>(null);
  const heat = useRef<THREE.MeshBasicMaterial>(null);
  const last = useRef(0);
  const anvil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16121c', metalness: 0.95, roughness: 0.25 }), []);
  const inner = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6b2c').multiplyScalar(3), toneMapped: false }), []);
  useFrame(({ camera }) => {
    const group = tile.current?.parent;
    if (!group?.visible) return;
    const t = clock.t;
    const cycle = t % 2.4;
    if (tile.current) {
      tile.current.rotation.y = t * 0.6;
      tile.current.position.y = 1.2 + Math.sin(t * 1.2) * 0.15 - Math.max(0, 0.25 - cycle) * 0.6;
    }
    if (heat.current) heat.current.color.setRGB(3 + 5 * Math.exp(-cycle * 4), 1.1 + 2 * Math.exp(-cycle * 4), 0.35);
    if (t - last.current > 2.4) {
      last.current = t;
      emitSparks({ count: 70, origin: [x, y + 1.2, z], color: COLORS.emberLight, speed: [2, 9], life: [0.5, 1.6], intensity: 5, gravity: -7, drag: 0.8, size: [0.03, 0.09] });
      if (camera.position.distanceTo(group.position) < 30) playSfx('tick', { gain: 1.5 });
    }
  });
  return (
    <group position={[x, y, z]}>
      <mesh material={anvil} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.45, 24, 120]} />
      </mesh>
      <mesh material={inner} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[2.12, 0.04, 8, 160]} />
      </mesh>
      <mesh ref={tile}>
        <boxGeometry args={[1.1, 1.1, 0.2]} />
        <meshBasicMaterial ref={heat} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Horizon: the finale portal — lava-cracked ring around a vortex */
export function Horizon() {
  const [x, y, z] = ANCHORS.horizon;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, ...fogUniforms },
        vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${GLSL_NOISE}
          uniform float uTime; varying vec2 vP;
          void main(){
            float r = length(vP);
            float a = atan(vP.y, vP.x);
            // vortex inside
            float swirl = fbm(vec3(cos(a) * 1.5 + r * 0.15, sin(a) * 1.5 - uTime * 0.15, r * 0.35 - uTime * 0.4));
            float inside = smoothstep(7.0, 2.0, r);
            vec3 vort = mix(vec3(0.16, 0.8, 1.0), vec3(1.0, 0.42, 0.17), smoothstep(-0.3, 0.5, swirl + sin(a + uTime * 0.2) * 0.3));
            vort = mix(vort, vec3(0.6, 0.48, 1.0), smoothstep(0.3, 0.8, swirl) * 0.6);
            vec3 col = vort * (0.25 + 0.9 * smoothstep(0.0, 0.8, swirl)) * inside * smoothstep(0.0, 5.0, r);
            col += vec3(1.0, 0.95, 0.9) * exp(-r * 1.2) * 0.8;
            // ring with lava cracks
            float ring = exp(-pow((r - 7.2) * 1.3, 2.0));
            float cracks = pow(1.0 - abs(snoise(vec3(a * 3.0, r * 0.8, uTime * 0.1)) ), 14.0);
            float embers = smoothstep(0.55, 1.0, fbm(vec3(a * 6.0, r * 1.5 - uTime * 0.6, uTime * 0.2)));
            col += vec3(1.0, 0.38, 0.1) * ring * (0.6 + 2.6 * cracks + embers * 1.5);
            col += vec3(1.0, 0.75, 0.4) * exp(-pow((r - 7.2) * 8.0, 2.0)) * 1.4;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  const portal = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!portal.current?.parent?.visible) return;
    mat.uniforms.uTime.value = clock.t;
    if (Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      emitSparks({ count: 1, origin: [x + Math.cos(a) * 7.2, y + Math.sin(a) * 7.2, z + 0.3], velocity: [Math.cos(a) * 0.6, Math.sin(a) * 0.6 + 0.8, 0.4], speed: [0, 0.4], color: COLORS.emberLight, life: [1, 2.4], intensity: 3, gravity: -0.3, drag: 0.4, size: [0.04, 0.1] });
    }
  });
  return (
    <mesh ref={portal} position={[x, y, z]} material={mat}>
      <planeGeometry args={[20, 20, 1, 1]} />
    </mesh>
  );
}

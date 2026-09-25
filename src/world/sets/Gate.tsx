import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clock, COLORS, mulberry32 } from '../fx';
import { emitSparks } from '../Sparks';
import { shatter } from '../Shards';
import { createTileMaterial, tileAttributes, tileGeometry } from '../tileMaterial';
import { laserMaterial } from '../Laser';
import { ANCHORS } from '../stations';

const COUNT = 54;
const SPAN = 17;

/** The Sentinel gate: tiles stream through a laser doorway. Masks shatter, clean tiles gain colour. */
export function Gate() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const plane = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => tileGeometry().clone(), []);
  const mat = useMemo(() => createTileMaterial(), []);
  const lmat = useMemo(() => {
    const m = laserMaterial();
    m.uniforms.uRadius.value = 4.9;
    m.uniforms.uAlpha.value = 1;
    m.uniforms.uColor.value = new THREE.Color('#ff7a45');
    return m;
  }, []);
  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15121c', metalness: 0.92, roughness: 0.28, envMapIntensity: 1.4 }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a5c').multiplyScalar(2.2), toneMapped: false }), []);
  const glowMat2 = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#29d3ff').multiplyScalar(2.2), toneMapped: false }), []);

  const data = useMemo(() => {
    const rnd = mulberry32(21);
    const kinds = new Uint8Array(COUNT).map(() => (rnd() < 0.22 ? 1 : 0));
    const attrs = tileAttributes(COUNT, 23, (i) => kinds[i]);
    const x = new Float32Array(COUNT).map(() => (rnd() * 2 - 1) * SPAN);
    const y = new Float32Array(COUNT).map(() => (rnd() * 2 - 1) * 2.8);
    const z = new Float32Array(COUNT).map(() => (rnd() * 2 - 1) * 2.8);
    const speed = new Float32Array(COUNT).map(() => 2.4 + rnd() * 1.6);
    const spin = new Float32Array(COUNT).map(() => rnd() * 6);
    const dead = new Float32Array(COUNT); // respawn timer
    const judged = new Float32Array(COUNT).map((_, i) => (x[i] > 0 ? 1 : 0));
    return { kinds, attrs, x, y, z, speed, spin, dead, judged, rnd };
  }, []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), e: new THREE.Euler() }), []);
  const [ax, ay, az] = ANCHORS.gate;

  useFrame(() => {
    const im = mesh.current;
    const group = im?.parent;
    if (!im || !group?.visible) return;
    const dt = clock.simDt;
    const aDyn = data.attrs.aDyn;
    const planeX = 0;
    for (let i = 0; i < COUNT; i++) {
      if (data.dead[i] > 0) {
        data.dead[i] -= dt;
        tmp.m.compose(tmp.p.set(0, -1e4, 0), tmp.q.identity(), tmp.s.setScalar(0));
        im.setMatrixAt(i, tmp.m);
        if (data.dead[i] <= 0) {
          data.x[i] = -SPAN;
          data.judged[i] = 0;
          data.kinds[i] = data.rnd() < 0.22 ? 1 : 0;
          data.attrs.aStatic[i * 4 + 3] = data.kinds[i];
        }
        continue;
      }
      const prev = data.x[i];
      data.x[i] += data.speed[i] * dt;
      if (prev < planeX && data.x[i] >= planeX) {
        if (data.kinds[i] === 1) {
          tmp.p.set(ax + data.x[i], ay + data.y[i], az + data.z[i]);
          shatter(tmp.p, { count: 8, power: 4 });
          emitSparks({ count: 16, origin: tmp.p, color: COLORS.danger, speed: [1, 5], life: [0.3, 0.9], intensity: 4 });
          data.dead[i] = 1.5 + data.rnd() * 2;
          continue;
        }
        data.judged[i] = 0.001;
        emitSparks({ count: 5, origin: [ax + planeX, ay + data.y[i], az + data.z[i]], color: COLORS.white, speed: [0.5, 2], life: [0.3, 0.6], intensity: 3, gravity: 0 });
      }
      if (data.judged[i] > 0) data.judged[i] = Math.min(1, data.judged[i] + dt * 2);
      if (data.x[i] > SPAN) {
        data.x[i] = -SPAN;
        data.judged[i] = 0;
      }
      const edge = Math.min(1, (SPAN - Math.abs(data.x[i])) / 3);
      tmp.e.set(data.spin[i] + clock.sim * 0.6, data.spin[i] * 0.5 + clock.sim * 0.4, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p.set(data.x[i], data.y[i], data.z[i]), tmp.q, tmp.s.setScalar(0.42));
      im.setMatrixAt(i, tmp.m);
      const d = i * 4;
      const glitchPulse = 0.5 + 0.5 * Math.sin(clock.t * 8 + i);
      aDyn[d] = data.kinds[i] === 1 ? 0.3 + 0.7 * glitchPulse : 0;
      aDyn[d + 1] = data.judged[i];
      aDyn[d + 2] = edge;
      aDyn[d + 3] = Math.exp(-Math.pow((data.x[i] - planeX) * 1.6, 2)) * 0.9;
    }
    im.instanceMatrix.needsUpdate = true;
    (im.geometry.getAttribute('aDyn') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (im.geometry.getAttribute('aStatic') as THREE.InstancedBufferAttribute).needsUpdate = true;
    lmat.uniforms.uTime.value = clock.t;
    if (plane.current) plane.current.rotation.z = clock.t * 0.2;
  });

  return (
    <group position={[ax, ay, az]}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh material={ringMat}>
          <torusGeometry args={[5.2, 0.32, 24, 160]} />
        </mesh>
        <mesh material={glowMat} position={[0, 0, 0.2]}>
          <torusGeometry args={[4.82, 0.025, 8, 200]} />
        </mesh>
        <mesh material={glowMat2} position={[0, 0, -0.2]}>
          <torusGeometry args={[4.82, 0.025, 8, 200]} />
        </mesh>
        <mesh ref={plane} material={lmat}>
          <circleGeometry args={[4.9, 96]} />
        </mesh>
      </group>
      <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false}>
        <instancedBufferAttribute attach="geometry-attributes-aStatic" args={[data.attrs.aStatic, 4]} />
        <instancedBufferAttribute attach="geometry-attributes-aDyn" args={[data.attrs.aDyn, 4]} usage={THREE.DynamicDrawUsage} />
        <instancedBufferAttribute attach="geometry-attributes-aColA" args={[data.attrs.aColA, 3]} />
        <instancedBufferAttribute attach="geometry-attributes-aColB" args={[data.attrs.aColB, 3]} />
      </instancedMesh>
    </group>
  );
}

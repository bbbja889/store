import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CuboidCollider, InstancedRigidBodies, Physics, RigidBody, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { world, addTrauma } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, mulberry32 } from '../fx';
import { emitSparks } from '../Sparks';
import { shatter } from '../Shards';
import { createTileMaterial, tileAttributes, tileGeometry } from '../tileMaterial';
import { ANCHORS } from '../stations';

const COUNT = 30;
const W = 7;
const H = 4.4;
const D = 3.2;

/**
 * The Quarantine: real rigid-body physics (Rapier). Packages rain into a glass chamber and pile up;
 * tap one to scan it — clean packages levitate out, masks shatter.
 */
export default function Quarantine() {
  const [ax, ay, az] = ANCHORS.quarantine;
  const bodies = useRef<RapierRigidBody[]>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => tileGeometry().clone(), []);
  const mat = useMemo(() => createTileMaterial(), []);
  const rnd = useMemo(() => mulberry32(77), []);
  const kinds = useMemo(() => new Uint8Array(COUNT).map(() => (rnd() < 0.3 ? 1 : 0)), [rnd]);
  const attrs = useMemo(() => tileAttributes(COUNT, 41, (i) => kinds[i]), [kinds]);
  const state = useMemo(
    () => ({
      judged: new Float32Array(COUNT),
      floating: new Uint8Array(COUNT),
      respawn: new Float32Array(COUNT),
    }),
    [],
  );

  const instances = useMemo<InstancedRigidBodyProps[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        key: `pkg-${i}`,
        position: [ax + (rnd() - 0.5) * (W - 1.2), ay + 3 + i * 0.45, az + (rnd() - 0.5) * (D - 1)],
        rotation: [rnd() * 3, rnd() * 3, rnd() * 3],
        scale: [0.62, 0.62, 0.62],
      })),
    [ax, ay, az, rnd],
  );

  const respawn = (i: number) => {
    const b = bodies.current?.[i];
    if (!b) return;
    kinds[i] = rnd() < 0.3 ? 1 : 0;
    attrs.aStatic[i * 4 + 3] = kinds[i];
    state.judged[i] = 0;
    state.floating[i] = 0;
    b.setGravityScale(1, true);
    b.setLinvel({ x: 0, y: -2, z: 0 }, true);
    b.setAngvel({ x: rnd() * 4 - 2, y: rnd() * 4 - 2, z: rnd() * 4 - 2 }, true);
    b.setTranslation({ x: ax + (rnd() - 0.5) * (W - 1.2), y: ay + H + 2 + rnd() * 2, z: az + (rnd() - 0.5) * (D - 1) }, true);
    b.setEnabled(true);
  };

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    const target = e.nativeEvent.target as HTMLElement | null;
    if (target?.closest('a,button,input,textarea,select,[role="button"]')) return;
    const i = e.instanceId;
    if (i === undefined || state.judged[i] > 0) return;
    e.stopPropagation();
    const b = bodies.current?.[i];
    if (!b) return;
    const p = b.translation();
    const pos = new THREE.Vector3(p.x, p.y, p.z);
    state.judged[i] = 0.001;
    if (kinds[i] === 1) {
      shatter(pos, { count: 14, power: 5, floor: ay - H / 2 + 0.05 });
      emitSparks({ count: 60, origin: pos, color: COLORS.danger, speed: [2, 8], life: [0.4, 1.2], intensity: 5, gravity: -5 });
      addTrauma(0.2);
      playSfx('alarm', { gain: 0.6 });
      world.quarantine.neutralized++;
      b.setEnabled(false);
      b.setTranslation({ x: ax, y: ay - 100, z: az }, false);
      state.respawn[i] = 2.2;
    } else {
      emitSparks({ count: 30, origin: pos, color: COLORS.safe, speed: [1, 4], life: [0.4, 1], intensity: 3, gravity: 1 });
      playSfx('good', { gain: 0.7 });
      world.quarantine.released++;
      state.floating[i] = 1;
      b.setGravityScale(-0.35, true);
      b.applyImpulse({ x: (rnd() - 0.5) * 0.3, y: 1.2, z: 0.2 }, true);
      b.applyTorqueImpulse({ x: 0, y: 0.08, z: 0 }, true);
    }
  };

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const dt = clock.dt;
    for (let i = 0; i < COUNT; i++) {
      if (state.respawn[i] > 0) {
        state.respawn[i] -= dt;
        if (state.respawn[i] <= 0) respawn(i);
      }
      if (state.judged[i] > 0) state.judged[i] = Math.min(1, state.judged[i] + dt * 2.5);
      if (state.floating[i]) {
        const b = bodies.current?.[i];
        if (b && b.translation().y > ay + H + 4) respawn(i);
      }
      const d = i * 4;
      const pulse = 0.5 + 0.5 * Math.sin(clock.t * 6 + i * 1.7);
      attrs.aDyn[d] = kinds[i] === 1 && state.judged[i] === 0 ? 0.25 + 0.6 * pulse * pulse : 0;
      attrs.aDyn[d + 1] = state.judged[i];
      attrs.aDyn[d + 2] = 1;
      attrs.aDyn[d + 3] = state.floating[i] ? 0.25 : 0;
    }
    (im.geometry.getAttribute('aDyn') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (im.geometry.getAttribute('aStatic') as THREE.InstancedBufferAttribute).needsUpdate = true;
  });

  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#9ad8ff', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }), []);
  const edge = useMemo(() => new THREE.LineBasicMaterial({ color: new THREE.Color('#8fe9ff').multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.6 }), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), []);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#100e15', metalness: 0.85, roughness: 0.35 }), []);

  return (
    <group>
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        <RigidBody type="fixed" colliders={false} position={[ax, ay - H / 2, az]}>
          <CuboidCollider args={[W / 2, 0.1, D / 2]} position={[0, -0.1, 0]} />
          <CuboidCollider args={[0.1, H, D / 2]} position={[-W / 2 - 0.1, H / 2, 0]} />
          <CuboidCollider args={[0.1, H, D / 2]} position={[W / 2 + 0.1, H / 2, 0]} />
          <CuboidCollider args={[W / 2, H, 0.1]} position={[0, H / 2, -D / 2 - 0.1]} />
          <CuboidCollider args={[W / 2, H, 0.1]} position={[0, H / 2, D / 2 + 0.1]} />
        </RigidBody>
        <InstancedRigidBodies ref={bodies} instances={instances} colliders="cuboid" restitution={0.25} friction={0.7} linearDamping={0.15} angularDamping={0.25}>
          <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} onPointerDown={onTap}>
            <instancedBufferAttribute attach="geometry-attributes-aStatic" args={[attrs.aStatic, 4]} />
            <instancedBufferAttribute attach="geometry-attributes-aDyn" args={[attrs.aDyn, 4]} usage={THREE.DynamicDrawUsage} />
            <instancedBufferAttribute attach="geometry-attributes-aColA" args={[attrs.aColA, 3]} />
            <instancedBufferAttribute attach="geometry-attributes-aColB" args={[attrs.aColB, 3]} />
          </instancedMesh>
        </InstancedRigidBodies>
      </Physics>
      <group position={[ax, ay, az]}>
        <mesh material={glass}>
          <boxGeometry args={[W, H, D]} />
        </mesh>
        <lineSegments geometry={edgesGeo} material={edge} />
        <mesh material={floorMat} position={[0, -H / 2 - 0.12, 0]}>
          <boxGeometry args={[W + 0.6, 0.24, D + 0.6]} />
        </mesh>
      </group>
    </group>
  );
}

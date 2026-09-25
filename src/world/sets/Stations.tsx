import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Gate } from './Gate';
import { Lab } from './Lab';
import { Forge, Horizon, Pedestal, VaultWall } from './Pieces';
import { ANCHORS } from '../stations';

const tmp = new THREE.Vector3();

/** Renders a set piece only while the camera is within `radius` of its anchor. */
function Near({ anchor, radius = 48, children }: { anchor: readonly [number, number, number]; radius?: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!g.current) return;
    g.current.visible = camera.position.distanceTo(tmp.set(anchor[0], anchor[1], anchor[2])) < radius;
  }, -5);
  return <group ref={g}>{children}</group>;
}

export function Stations() {
  return (
    <>
      <Near anchor={ANCHORS.gate}>
        <Gate />
      </Near>
      <Near anchor={ANCHORS.passport}>
        <Pedestal />
      </Near>
      <Near anchor={ANCHORS.vault} radius={60}>
        <VaultWall />
      </Near>
      <Near anchor={ANCHORS.forge}>
        <Forge />
      </Near>
      <Near anchor={ANCHORS.horizon} radius={56}>
        <Horizon />
      </Near>
      <Near anchor={ANCHORS.lab} radius={40}>
        <Lab />
      </Near>
    </>
  );
}

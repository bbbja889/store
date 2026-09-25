import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { Backdrop } from './Backdrop';
import { Conductor } from './Conductor';
import { Core } from './Core';
import { Director } from './Director';
import { Effects } from './Effects';
import { FOG } from './fx';
import { FilmCues } from './FilmCues';
import { Laser } from './Laser';
import { Mask } from './Mask';
import { Packets } from './Packets';
import { Serpents } from './Serpents';
import { Shards } from './Shards';
import { Sparks } from './Sparks';
import { Stations } from './sets/Stations';
import { Title } from './Title';

const Quarantine = lazy(() => import('./sets/Quarantine'));

const COUNTS = {
  1: { packets: 520, rings: [16, 22, 28] as [number, number, number], title: 3200, mask: 260 },
  2: { packets: 950, rings: [22, 30, 38] as [number, number, number], title: 5200, mask: 420 },
  3: { packets: 1400, rings: [26, 34, 44] as [number, number, number], title: 7000, mask: 560 },
};

function Studio() {
  // Procedural environment for reflections — teal & orange light panels, no network fetch.
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#050407']} />
      <Lightformer form="rect" intensity={3} color="#ff6b2c" position={[-6, 1, 2]} scale={[4, 10, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={3} color="#29d3ff" position={[6, 0, 2]} scale={[4, 10, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={2} color="#d9ccff" position={[0, 6, -2]} scale={4} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1} color="#ffffff" position={[0, -5, 4]} scale={[10, 2, 1]} />
    </Environment>
  );
}

export function WorldCanvas() {
  const tier = useExperience((s) => s.tier) as 1 | 2 | 3;
  const degrade = useExperience((s) => s.degrade);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, tier >= 3 ? 1.75 : tier === 2 ? 1.4 : 1));
  const [quarantine, setQuarantine] = useState(false);
  const c = COUNTS[Math.max(1, tier) as 1 | 2 | 3];

  // Mount the physics set piece only once the visitor scrolls near it.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (world.path.active && (world.path.from === 'quarantine' || world.path.to === 'quarantine' || world.path.from === 'gate')) {
        setQuarantine(true);
        window.clearInterval(id);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Canvas
      className="!fixed inset-0"
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      aria-hidden
      dpr={dpr}
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      camera={{ fov: 34, near: 0.1, far: 800, position: [0, 0.04, 3.4] }}
      eventSource={document.getElementById('root') ?? undefined}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.setClearColor(FOG.color);
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr((d) => Math.max(0.75, d * 0.8));
        }}
        onFallback={() => degrade()}
        flipflops={3}
      />
      <fogExp2 attach="fog" args={[FOG.color, FOG.density]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[-8, 4, 6]} intensity={1.4} color="#ff9a66" />
      <directionalLight position={[8, 2, 6]} intensity={1.2} color="#66d9ff" />
      <Director />
      <Conductor />
      <Suspense fallback={null}>
        <Studio />
        <Backdrop tier={tier} />
        <Core tier={tier} />
        <Packets count={c.packets} ringCounts={c.rings} />
        <Mask count={c.mask} />
        <Serpents />
        <FilmCues />
        <Title count={c.title} />
        <Laser />
        <Sparks />
        <Shards />
        <Stations />
        {quarantine && tier >= 2 && <Quarantine />}
        <Effects tier={tier} />
      </Suspense>
    </Canvas>
  );
}

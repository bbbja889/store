import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL } from '@/intro/script';
import { world } from '@/state/world';

export function Effects({ tier }: { tier: number }) {
  const bloom = useRef<BloomEffect>(null);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), []);

  useFrame(() => {
    const intro = world.intro;
    const t = intro.t;
    let boost = 0;
    if (intro.running && intro.kind === 'full') {
      boost += Math.exp(-Math.pow((t - FULL.fusion - 0.1) * 2.2, 2)) * 2.4;
      boost += Math.exp(-Math.pow((t - FULL.slice - 0.2) * 5, 2)) * 1.1;
      boost += Math.exp(-Math.pow((t - FULL.burst) * 5, 2)) * 0.8;
    }
    if (bloom.current) bloom.current.intensity = 1.05 + boost;
    const v = Math.min(1, Math.abs(world.scrollVelocity) / 60);
    const amt = 0.0005 + world.trauma * world.trauma * 0.006 + v * 0.0022 + boost * 0.0012;
    offset.set(amt, amt * 0.6);
    if (ca.current) ca.current.offset = offset;
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={1.05} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.78} resolutionScale={tier >= 2 ? 0.5 : 0.35} />
      {/* tone map HDR first, so grain and fringing act on display-range colour */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration ref={ca} offset={offset} radialModulation modulationOffset={0.35} blendFunction={BlendFunction.NORMAL} />
      <Noise premultiply opacity={tier >= 2 ? 0.5 : 0.35} blendFunction={BlendFunction.OVERLAY} />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL, range } from '@/intro/script';
import { world } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock } from './fx';
import { laserY } from './Packets';

/** The Sentinel sweep: a razor-thin sheet of light that judges every tile it crosses. */
export const laserMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uRadius: { value: 22 }, uColor: { value: new THREE.Color('#ff8a5c') } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uAlpha; uniform float uRadius; uniform vec3 uColor;
      varying vec2 vP;
      void main(){
        float r = length(vP) / uRadius;
        float fall = smoothstep(1.0, 0.2, r);
        vec2 grid = abs(fract(vP * 1.2) - 0.5);
        float lines = smoothstep(0.47, 0.5, max(grid.x, grid.y)) * 0.35;
        float rings = pow(abs(sin(length(vP) * 2.0 - uTime * 6.0)), 40.0) * 0.6;
        float rim = exp(-pow((r - 0.98) * 60.0, 2.0)) * 3.0;
        vec3 c = uColor * (0.06 + lines + rings) * fall + vec3(1.0, 0.9, 0.85) * rim;
        gl_FragColor = vec4(c * uAlpha, 1.0);
      }`,
  });

export function Laser() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => laserMaterial(), []);
  const cue = useRef({ played: false, lastT: -1 });
  useFrame(() => {
    const intro = world.intro;
    const s = FULL;
    const on = intro.running && intro.kind === 'full' && intro.t > s.scan - 0.2 && intro.t < s.scanEnd + 0.4;
    const m = mesh.current;
    if (!m) return;
    m.visible = on;
    if (intro.t < cue.current.lastT) cue.current.played = false;
    cue.current.lastT = intro.t;
    if (!on) return;
    if (!cue.current.played && intro.t >= s.scan) {
      cue.current.played = true;
      playSfx('laser');
    }
    m.position.y = laserY(intro.t);
    mat.uniforms.uTime.value = clock.t;
    mat.uniforms.uAlpha.value = range(intro.t, s.scan - 0.2, s.scan + 0.15) * (1 - range(intro.t, s.scanEnd, s.scanEnd + 0.4));
  });
  return (
    <mesh ref={mesh} material={mat} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={3}>
      <circleGeometry args={[22, 96]} />
    </mesh>
  );
}

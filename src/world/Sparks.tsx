import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clock, fogUniforms, GLSL_FOG } from './fx';

/** Global spark pool — any component can emit. Integrated in simulation time (bullet time aware). */
const MAX = 4096;
const pos = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3);
const col = new Float32Array(MAX * 3);
const life = new Float32Array(MAX);
const maxLife = new Float32Array(MAX);
const size = new Float32Array(MAX);
const drag = new Float32Array(MAX);
const grav = new Float32Array(MAX);
let cursor = 0;

export interface SparkOptions {
  count: number;
  origin: THREE.Vector3 | [number, number, number];
  /** Base velocity added to every spark. */
  velocity?: [number, number, number];
  speed?: [number, number];
  spread?: number;
  /** Direction bias (unit vector); when omitted sparks go in random directions. */
  direction?: [number, number, number];
  color: THREE.Color;
  colorJitter?: number;
  intensity?: number;
  life?: [number, number];
  size?: [number, number];
  gravity?: number;
  drag?: number;
  jitter?: number;
}

const tmp = new THREE.Vector3();

export function emitSparks(o: SparkOptions) {
  const [ox, oy, oz] = Array.isArray(o.origin) ? o.origin : [o.origin.x, o.origin.y, o.origin.z];
  const [s0, s1] = o.speed ?? [2, 6];
  const [l0, l1] = o.life ?? [0.6, 1.4];
  const [z0, z1] = o.size ?? [0.05, 0.14];
  const inten = o.intensity ?? 3;
  for (let n = 0; n < o.count; n++) {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    tmp.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    if (o.direction) {
      const sp = o.spread ?? 0.35;
      tmp.multiplyScalar(sp).add(new THREE.Vector3(...o.direction)).normalize();
    }
    const sp = s0 + Math.random() * (s1 - s0);
    const j = o.jitter ?? 0;
    pos[i * 3] = ox + (Math.random() - 0.5) * j;
    pos[i * 3 + 1] = oy + (Math.random() - 0.5) * j;
    pos[i * 3 + 2] = oz + (Math.random() - 0.5) * j;
    const bv = o.velocity ?? [0, 0, 0];
    vel[i * 3] = tmp.x * sp + bv[0];
    vel[i * 3 + 1] = tmp.y * sp + bv[1];
    vel[i * 3 + 2] = tmp.z * sp + bv[2];
    const cj = o.colorJitter ?? 0.15;
    col[i * 3] = o.color.r * inten * (1 - cj + Math.random() * cj * 2);
    col[i * 3 + 1] = o.color.g * inten * (1 - cj + Math.random() * cj * 2);
    col[i * 3 + 2] = o.color.b * inten * (1 - cj + Math.random() * cj * 2);
    const l = l0 + Math.random() * (l1 - l0);
    life[i] = l;
    maxLife[i] = l;
    size[i] = z0 + Math.random() * (z1 - z0);
    drag[i] = o.drag ?? 1.6;
    grav[i] = o.gravity ?? -2.5;
  }
}

export function clearSparks() {
  life.fill(0);
}

export function Sparks() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...fogUniforms, uViewH: { value: 900 } },
        vertexShader: /* glsl */ `
          attribute vec3 aColor; attribute float aSize;
          uniform float uViewH;
          varying vec3 vColor; varying float vDist;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            vDist = -mv.z;
            gl_PointSize = aSize * projectionMatrix[1][1] * uViewH * 0.5 / max(0.3, -mv.z);
            vColor = aColor;
          }`,
        fragmentShader: /* glsl */ `
          ${GLSL_FOG}
          varying vec3 vColor; varying float vDist;
          void main(){
            vec2 d = gl_PointCoord - 0.5;
            float a = smoothstep(0.5, 0.0, length(d));
            a *= a;
            gl_FragColor = vec4(applyFog(vColor, vDist) * a, a);
          }`,
      }),
    [],
  );
  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    const dt = clock.simDt;
    mat.uniforms.uViewH.value = state.gl.domElement.height;
    const p = geo.attributes.position.array as Float32Array;
    const c = geo.attributes.aColor.array as Float32Array;
    const s = geo.attributes.aSize.array as Float32Array;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) {
        s[i] = 0;
        continue;
      }
      life[i] -= dt;
      const k = Math.max(0, 1 - drag[i] * dt);
      vel[i * 3] *= k;
      vel[i * 3 + 1] = vel[i * 3 + 1] * k + grav[i] * dt;
      vel[i * 3 + 2] *= k;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const f = Math.max(0, life[i] / maxLife[i]);
      p[i * 3] = pos[i * 3];
      p[i * 3 + 1] = pos[i * 3 + 1];
      p[i * 3 + 2] = pos[i * 3 + 2];
      // cool down: hot white → colour → dark
      const heat = f * f;
      c[i * 3] = col[i * 3] * f + heat * 0.6;
      c[i * 3 + 1] = col[i * 3 + 1] * f + heat * 0.45;
      c[i * 3 + 2] = col[i * 3 + 2] * f + heat * 0.3;
      s[i] = size[i] * (0.4 + 0.6 * f);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clock } from './fx';

/**
 * Rigid shards with ballistic motion: velocity, gravity, air drag, spin, a floor bounce with
 * restitution and friction — cheap "realistic physics" for shattering masks.
 */
const MAX = 1400;
const P = new Float32Array(MAX * 3);
const V = new Float32Array(MAX * 3);
const Q = new Float32Array(MAX * 4);
const W = new Float32Array(MAX * 3);
const L = new Float32Array(MAX);
const LMAX = new Float32Array(MAX);
const S = new Float32Array(MAX);
const C = new Float32Array(MAX * 3);
const FLOOR = new Float32Array(MAX);
let cursor = 0;

export function shatter(origin: THREE.Vector3, opts: { color?: THREE.Color; count?: number; power?: number; floor?: number; scale?: number } = {}) {
  const count = opts.count ?? 9;
  const power = opts.power ?? 5.5;
  const color = opts.color ?? new THREE.Color('#ff3d5a');
  for (let n = 0; n < count; n++) {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 0.6, Math.random() * 2 - 1).normalize();
    const sp = power * (0.45 + Math.random() * 0.8);
    P.set([origin.x + dir.x * 0.12, origin.y + dir.y * 0.12, origin.z + dir.z * 0.12], i * 3);
    V.set([dir.x * sp, dir.y * sp + 1.5, dir.z * sp], i * 3);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    Q.set([q.x, q.y, q.z, q.w], i * 4);
    W.set([(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18], i * 3);
    const l = 1.4 + Math.random() * 1.4;
    L[i] = l;
    LMAX[i] = l;
    S[i] = (0.07 + Math.random() * 0.13) * (opts.scale ?? 1);
    C.set([color.r, color.g, color.b], i * 3);
    FLOOR[i] = opts.floor ?? -1e9;
  }
}

export function Shards() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    // Thin irregular shard: a flattened tetrahedron.
    const g = new THREE.TetrahedronGeometry(1, 0);
    g.scale(1, 0.35, 1.6);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dq = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const w = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const dt = Math.min(clock.simDt, 1 / 30);
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (L[i] <= 0) {
        s.setScalar(0);
        m4.compose(p.set(0, -1e4, 0), q.identity(), s);
        im.setMatrixAt(i, m4);
        continue;
      }
      any = true;
      L[i] -= dt;
      const drag = Math.max(0, 1 - 0.9 * dt);
      V[i * 3] *= drag;
      V[i * 3 + 1] = V[i * 3 + 1] * drag - 9.8 * 0.6 * dt;
      V[i * 3 + 2] *= drag;
      P[i * 3] += V[i * 3] * dt;
      P[i * 3 + 1] += V[i * 3 + 1] * dt;
      P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < FLOOR[i]) {
        P[i * 3 + 1] = FLOOR[i];
        V[i * 3 + 1] = -V[i * 3 + 1] * 0.35; // restitution
        V[i * 3] *= 0.7; // friction
        V[i * 3 + 2] *= 0.7;
        W[i * 3] *= 0.6;
        W[i * 3 + 1] *= 0.6;
        W[i * 3 + 2] *= 0.6;
      }
      // integrate angular velocity
      w.set(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]);
      const ang = w.length() * dt;
      q.set(Q[i * 4], Q[i * 4 + 1], Q[i * 4 + 2], Q[i * 4 + 3]);
      if (ang > 1e-5) {
        dq.setFromAxisAngle(w.normalize(), ang);
        q.premultiply(dq);
        Q.set([q.x, q.y, q.z, q.w], i * 4);
      }
      const f = L[i] / LMAX[i];
      const sc = S[i] * Math.min(1, f * 3);
      s.set(sc, sc, sc);
      m4.compose(p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), q, s);
      im.setMatrixAt(i, m4);
      const heat = 0.25 + 3.2 * f * f;
      color.setRGB(C[i * 3] * heat, C[i * 3 + 1] * heat, C[i * 3 + 2] * heat);
      im.setColorAt(i, color);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.visible = any;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(MAX * 3), 3]} />
    </instancedMesh>
  );
}

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FULL, range } from '@/intro/script';
import { world } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, mulberry32 } from './fx';
import { emitSparks } from './Sparks';

export const TITLE_Z = 5.4;

/** Samples glyph pixels of a word rendered with the display font into normalised points. */
async function sampleWord(word: string, count: number): Promise<{ pts: Float32Array; aspect: number }> {
  try {
    await document.fonts.load('900 200px "Unbounded Variable"');
  } catch {
    /* fall back to whatever is available */
  }
  const W = 1600;
  const H = 420;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 300;
  g.font = `900 ${size}px "Unbounded Variable", "Unbounded", system-ui, sans-serif`;
  const m = g.measureText(word);
  size = Math.min(size, (size * W * 0.94) / m.width);
  g.font = `900 ${size}px "Unbounded Variable", "Unbounded", system-ui, sans-serif`;
  const textW = g.measureText(word).width;
  g.fillText(word, W / 2, H / 2 + size * 0.04);
  const data = g.getImageData(0, 0, W, H).data;
  const cand: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 140) cand.push(x, y);
  const rnd = mulberry32(3);
  const pts = new Float32Array(count * 2);
  const n = cand.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rnd() * n);
    // normalise so the word spans x ∈ [-0.5, 0.5]
    pts[i * 2] = (cand[k * 2] + (rnd() - 0.5) * 2 - W / 2) / textW;
    pts[i * 2 + 1] = -(cand[k * 2 + 1] + (rnd() - 0.5) * 2 - H / 2) / textW;
  }
  return { pts, aspect: textW / size };
}

export function Title({ count }: { count: number }) {
  const [sample, setSample] = useState<{ pts: Float32Array } | null>(null);
  const { size } = useThree();
  const ref = useRef<THREE.Points>(null);
  useEffect(() => {
    let alive = true;
    sampleWord('VICZO', count).then((s) => alive && setSample(s));
    return () => {
      alive = false;
    };
  }, [count]);

  // Fit the word to the frame of the name shot (camera 13.6 from the title plane, fov 32).
  const aspect = size.width / size.height;
  const width = Math.min(11, 2 * 13.6 * Math.tan(THREE.MathUtils.degToRad(16)) * aspect * 0.82);

  const geo = useMemo(() => {
    if (!sample) return null;
    const rnd = mulberry32(19);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const start = new Float32Array(count * 3);
    const r4 = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([sample.pts[i * 2] * width, sample.pts[i * 2 + 1] * width, TITLE_Z + (rnd() - 0.5) * 0.12], i * 3);
      const rr = 7 + rnd() * 14;
      const th = rnd() * Math.PI * 2;
      start.set([Math.cos(th) * rr, (rnd() - 0.5) * 16, Math.sin(th) * rr], i * 3);
      r4.set([rnd(), rnd() < 0.28 ? 1 : 0, 0.5 + rnd() * 1.1, rnd()], i * 4);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(r4, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, [sample, count, width]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uForm: { value: 0 },
          uFlame: { value: 0 },
          uSlice: { value: -99 },
          uDissolve: { value: 0 },
          uTime: { value: 0 },
          uWidth: { value: 11 },
          uViewH: { value: 900 },
          uEmber: { value: COLORS.ember },
          uFusion: { value: COLORS.fusion },
          uTide: { value: COLORS.tide },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aStart; attribute vec4 aRnd;
          uniform float uForm, uFlame, uSlice, uDissolve, uTime, uWidth, uViewH;
          uniform vec3 uEmber, uFusion, uTide;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float seed = aRnd.x;
            float d = clamp((uForm - seed * 0.4) / 0.6, 0.0, 1.0);
            float e = 1.0 - pow(1.0 - d, 4.0);
            vec3 p = mix(aStart, position, e);
            float fl = 1.0 - e;
            p += vec3(sin(uTime * 1.7 + seed * 40.0), cos(uTime * 1.3 + seed * 23.0), sin(uTime + seed * 11.0)) * fl * 0.9;
            float h = 0.0;
            float flame = aRnd.y;
            if (flame > 0.5) {
              float cyc = fract(uTime * aRnd.z * 0.8 + aRnd.w);
              h = cyc * 0.95 * uFlame;
              p.y += h;
              p.x += sin(uTime * 7.0 + seed * 30.0) * 0.06 * cyc * uFlame;
            }
            float bl = exp(-pow((p.x - uSlice) * 2.2, 2.0));
            p.z += bl * 0.5 * (seed - 0.5);
            p.y += bl * 0.35 * (aRnd.w - 0.5);
            float dd = smoothstep(seed * 0.45, seed * 0.45 + 0.55, uDissolve);
            p = mix(p, vec3(0.0), dd);
            p.y += sin(dd * 3.14159) * 1.4 * (aRnd.w - 0.3);
            float gx = clamp(position.x / uWidth + 0.5, 0.0, 1.0);
            vec3 c = gx < 0.5 ? mix(uEmber, uFusion, gx * 2.0) : mix(uFusion, uTide, gx * 2.0 - 1.0);
            float hn = flame > 0.5 ? h / 0.95 : 0.0;
            if (flame > 0.5) c = mix(vec3(1.0, 0.82, 0.55), c, clamp(hn * 1.6, 0.0, 1.0));
            vColor = c * (1.5 + 6.0 * bl + 1.2 * dd);
            vAlpha = (1.0 - hn) * smoothstep(0.0, 0.15, uForm) * (1.0 - dd * 0.6);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float sz = flame > 0.5 ? 0.075 * (1.0 - hn * 0.6) : 0.058;
            gl_PointSize = sz * projectionMatrix[1][1] * uViewH * 0.5 / max(0.3, -mv.z);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.05, r) * vAlpha;
            gl_FragColor = vec4(vColor * a, a);
          }`,
      }),
    [],
  );

  const cues = useRef({ form: false, slice: false, dissolve: false, lastT: -1 });

  useFrame(({ gl }) => {
    const intro = world.intro;
    const s = FULL;
    const t = intro.t;
    const on = !!geo && intro.running && intro.kind === 'full' && t > s.name - 0.1 && t < s.dissolve + 1.3;
    const pts = ref.current;
    if (pts) pts.visible = on;
    if (!on) return;
    const c = cues.current;
    if (t < c.lastT) c.form = c.slice = c.dissolve = false;
    c.lastT = t;
    const u = mat.uniforms;
    u.uTime.value = clock.t;
    u.uWidth.value = width;
    u.uViewH.value = gl.domElement.height;
    u.uForm.value = range(t, s.name, s.name + 1.15);
    u.uFlame.value = range(t, s.name + 0.7, s.name + 1.4);
    const sl = range(t, s.slice, s.slice + 0.5);
    u.uSlice.value = sl > 0 && sl < 1 ? -width * 0.6 + sl * width * 1.2 : -99;
    u.uDissolve.value = range(t, s.dissolve, s.dissolve + 1.1);
    if (!c.form && t >= s.name) {
      c.form = true;
      playSfx('shimmer');
    }
    if (!c.slice && t >= s.slice) {
      c.slice = true;
      playSfx('blade');
    }
    if (sl > 0 && sl < 1) {
      emitSparks({ count: 10, origin: [u.uSlice.value, (Math.random() - 0.5) * width * 0.22, TITLE_Z + 0.2], color: COLORS.white, speed: [2, 7], life: [0.3, 0.8], intensity: 5, gravity: -3, size: [0.03, 0.08], jitter: 0.1 });
    }
    if (!c.dissolve && t >= s.dissolve) {
      c.dissolve = true;
      playSfx('hit');
    }
  });

  if (!geo) return null;
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={6} />;
}

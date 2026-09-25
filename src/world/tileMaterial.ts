import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fogUniforms, GLSL_FOG, mulberry32 } from './fx';
import { glyphAtlas, GLYPH_COUNT, MASK_GLYPH } from './glyphs';

let geo: THREE.BufferGeometry | null = null;
export function tileGeometry() {
  if (!geo) geo = new RoundedBoxGeometry(1, 1, 0.2, 3, 0.2);
  return geo;
}

/** Shared uniforms so every tile set glitches / pulses together. */
export const tileUniforms = {
  uTime: { value: 0 },
  uGlitch: { value: 0 },
};

export function createTileMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms,
      ...tileUniforms,
      uAtlas: { value: glyphAtlas() },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aStatic; // glyph, seed, isApp, kind (0 clean, 1 mask, 2 latent mask)
      attribute vec4 aDyn;    // glitch, judged, alpha, highlight
      attribute vec3 aColA;
      attribute vec3 aColB;
      uniform float uTime;
      uniform float uGlitch;
      varying vec3 vPos; varying vec3 vN; varying vec3 vW;
      varying vec4 vStatic; varying vec4 vDyn; varying vec3 vColA; varying vec3 vColB;
      varying float vGl;
      void main(){
        vec3 p = position;
        float gl = aDyn.x + (aStatic.w > 1.5 ? uGlitch : 0.0);
        vGl = gl;
        if (gl > 0.001) {
          float band = floor((p.y + 0.5) * 7.0);
          float tick = floor(uTime * 16.0);
          float n = fract(sin(band * 91.7 + tick * 13.1 + aStatic.y * 77.0) * 43758.5453);
          p.x += (n - 0.5) * 0.7 * gl * step(0.62, n);
          p.z += (n - 0.5) * 0.2 * gl;
        }
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vW = w.xyz;
        vPos = position;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vStatic = aStatic; vDyn = aDyn; vColA = aColA; vColB = aColB;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FOG}
      uniform sampler2D uAtlas;
      uniform float uTime;
      varying vec3 vPos; varying vec3 vN; varying vec3 vW;
      varying vec4 vStatic; varying vec4 vDyn; varying vec3 vColA; varying vec3 vColB;
      varying float vGl;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        float alpha = vDyn.z;
        if (alpha < 0.999 && ign(gl_FragCoord.xy) > alpha) discard;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float front = smoothstep(0.02, 0.09, vPos.z);
        vec2 uv = vPos.xy + 0.5;

        vec3 sorted = mix(vColA, vColB, clamp(uv.y * 0.85 + uv.x * 0.25, 0.0, 1.0));
        vec3 unsorted = mix(vec3(0.62, 0.6, 0.58), vec3(0.24, 0.23, 0.25), uv.y);
        vec3 base = mix(unsorted, sorted, vDyn.y);

        float kind = vStatic.w;
        float glyphIdx = vStatic.x;
        bool masked = kind > 0.5 && vGl > 0.02;
        if (masked) {
          float flick = step(0.55, fract(sin(floor(uTime * 9.0) + vStatic.y * 31.0) * 4375.5));
          glyphIdx = mix(glyphIdx, ${MASK_GLYPH.toFixed(1)}, flick * step(0.3, vGl));
          base = mix(base, mix(vec3(1.0, 0.16, 0.24), vec3(0.25, 0.0, 0.05), uv.y), clamp(vGl * 1.4, 0.0, 1.0));
        }
        vec2 cell = vec2(mod(glyphIdx, 4.0), floor(glyphIdx / 4.0));
        vec2 guv = (cell + vec2(0.5) + (vec2(uv.x, 1.0 - uv.y) - 0.5) * 0.74) / 4.0;
        float glyph = texture2D(uAtlas, guv).a * front;
        if (masked) {
          // chromatic split on the glyph
          float gr = texture2D(uAtlas, guv + vec2(0.012 * vGl, 0.0)).a * front;
          glyph = max(glyph, gr * 0.6);
        }

        vec3 Lember = normalize(vec3(-0.8, 0.35, 0.45));
        vec3 Ltide = normalize(vec3(0.8, 0.25, 0.4));
        float de = max(dot(N, Lember), 0.0);
        float dtd = max(dot(N, Ltide), 0.0);
        vec3 light = vec3(0.3) + de * vec3(1.0, 0.55, 0.3) * 0.75 + dtd * vec3(0.3, 0.75, 1.0) * 0.75;
        vec3 col = base * light * mix(0.35, 1.0, front);
        float gloss = pow(max(dot(reflect(-V, N), Lember), 0.0), 24.0) + pow(max(dot(reflect(-V, N), Ltide), 0.0), 24.0);
        col += gloss * 0.35;
        col = mix(col, vec3(1.0), glyph * 0.92);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += rim * mix(vec3(1.0, 0.45, 0.2), vec3(0.2, 0.8, 1.0), step(0.5, vStatic.z)) * (0.25 + 0.6 * vDyn.y);
        if (masked) {
          float scan = step(0.5, fract(vPos.y * 26.0 + uTime * 5.0));
          col *= 0.75 + 0.5 * scan;
          col += vec3(1.0, 0.1, 0.2) * vGl * 0.6;
        }
        col += vDyn.w * vec3(2.6, 2.4, 2.2);
        col = applyFog(col, length(cameraPosition - vW));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export const APP_PALETTES: [string, string][] = [
  ['#ff6b2c', '#ffb070'],
  ['#ff4d6d', '#ff9a5c'],
  ['#ffb347', '#ff6b2c'],
  ['#c17b50', '#ffcf9c'],
  ['#ff7a45', '#ff3d5a'],
];
export const SITE_PALETTES: [string, string][] = [
  ['#29d3ff', '#8fe9ff'],
  ['#2a7bff', '#29d3ff'],
  ['#00e0b8', '#29d3ff'],
  ['#9b7bff', '#29d3ff'],
  ['#3a5bff', '#9b7bff'],
];

/** Fills static per-instance attributes. kinds: 0 clean, 1 mask, 2 latent mask. */
export function tileAttributes(count: number, seed: number, kindOf: (i: number) => number) {
  const rnd = mulberry32(seed);
  const aStatic = new Float32Array(count * 4);
  const aDyn = new Float32Array(count * 4);
  const aColA = new Float32Array(count * 3);
  const aColB = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const isApp = rnd() < 0.55 ? 1 : 0;
    const pal = (isApp ? APP_PALETTES : SITE_PALETTES)[Math.floor(rnd() * 5)];
    const glyph = Math.floor(rnd() * (GLYPH_COUNT - 1));
    aStatic.set([glyph, rnd(), isApp, kindOf(i)], i * 4);
    aDyn.set([0, 1, 1, 0], i * 4);
    c.set(pal[0]);
    aColA.set([c.r, c.g, c.b], i * 3);
    c.set(pal[1]);
    aColB.set([c.r, c.g, c.b], i * 3);
  }
  return { aStatic, aDyn, aColA, aColB };
}

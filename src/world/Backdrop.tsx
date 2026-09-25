import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clock, COLORS, fogUniforms, GLSL_FOG, GLSL_NOISE, mulberry32 } from './fx';

/** Nebula sky + star field that travel with the camera, and dust that gives parallax depth. */
export function Backdrop({ tier }: { tier: number }) {
  const sky = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Points>(null);
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uEmber: { value: COLORS.ember }, uTide: { value: COLORS.tide }, uFusion: { value: COLORS.fusion }, uDepth: { value: 0 } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${GLSL_NOISE}
          uniform float uTime; uniform vec3 uEmber; uniform vec3 uTide; uniform vec3 uFusion; uniform float uDepth;
          varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(vec3(0.010, 0.008, 0.016), vec3(0.028, 0.02, 0.045), smoothstep(-0.5, 0.7, h));
            float horizon = exp(-pow(h * 3.2, 2.0));
            col += uEmber * 0.055 * horizon * smoothstep(0.3, -1.0, d.x);
            col += uTide * 0.05 * horizon * smoothstep(-0.3, 1.0, d.x);
            ${tier >= 2 ? 'float n = fbm(d * 2.2 + vec3(uTime * 0.008, uDepth * 0.01, 0.0));' : 'float n = snoise(d * 2.2);'}
            float neb = smoothstep(0.05, 0.75, n);
            col += mix(uFusion * 0.035, uEmber * 0.03, smoothstep(-0.2, 0.6, d.x)) * neb;
            col += uTide * 0.02 * smoothstep(0.4, 0.9, n) * smoothstep(0.0, 1.0, d.x);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [tier],
  );

  const starGeo = useMemo(() => {
    const rnd = mulberry32(5);
    const n = tier >= 2 ? 2600 : 1200;
    const p = new Float32Array(n * 3);
    const a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(260);
      p.set([v.x, v.y, v.z], i * 3);
      a.set([0.6 + Math.pow(rnd(), 4) * 2.6, rnd() * 10], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSz', new THREE.BufferAttribute(a, 2));
    return g;
  }, [tier]);
  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uDpr: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute vec2 aSz; uniform float uTime; uniform float uDpr; varying float vA;
          void main(){
            vA = 0.55 + 0.45 * sin(uTime * (0.6 + aSz.y * 0.2) + aSz.y * 7.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSz.x * uDpr;
          }`,
        fragmentShader: /* glsl */ `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r) * vA; gl_FragColor = vec4(vec3(0.95, 0.9, 1.0) * a, a); }`,
      }),
    [],
  );

  const dustGeo = useMemo(() => {
    const rnd = mulberry32(9);
    const n = tier >= 2 ? 900 : 400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([rnd() * 40 - 20, rnd() * 40 - 20, rnd() * 40 - 20], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }, [tier]);
  const dustMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...fogUniforms, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uViewH: { value: 900 } },
        vertexShader: /* glsl */ `
          uniform vec3 uCam; uniform float uTime; uniform float uViewH; varying float vDist; varying float vTw;
          void main(){
            vec3 p = position + vec3(sin(uTime * 0.1 + position.y) * 0.6, uTime * 0.12, cos(uTime * 0.08 + position.x) * 0.6);
            p = mod(p - uCam + 20.0, 40.0) - 20.0 + uCam;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vDist = -mv.z;
            vTw = 0.5 + 0.5 * sin(uTime * 2.0 + position.x * 3.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 0.045 * projectionMatrix[1][1] * uViewH * 0.5 / max(0.4, -mv.z);
          }`,
        fragmentShader: /* glsl */ `
          ${GLSL_FOG}
          varying float vDist; varying float vTw;
          void main(){
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, r) * (0.25 + 0.35 * vTw) * smoothstep(0.5, 3.0, vDist);
            gl_FragColor = vec4(applyFog(vec3(1.0, 0.86, 0.78), vDist) * a, a);
          }`,
      }),
    [],
  );

  useFrame(({ camera, gl }) => {
    sky.current?.position.copy(camera.position);
    stars.current?.position.copy(camera.position);
    skyMat.uniforms.uTime.value = clock.t;
    skyMat.uniforms.uDepth.value = camera.position.y;
    starMat.uniforms.uTime.value = clock.t;
    starMat.uniforms.uDpr.value = gl.getPixelRatio();
    dustMat.uniforms.uCam.value.copy(camera.position);
    dustMat.uniforms.uTime.value = clock.t;
    dustMat.uniforms.uViewH.value = gl.domElement.height;
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 48, 24]} />
      </mesh>
      <points ref={stars} geometry={starGeo} material={starMat} renderOrder={-9} frustumCulled={false} />
      <points geometry={dustGeo} material={dustMat} frustumCulled={false} renderOrder={7} />
    </>
  );
}

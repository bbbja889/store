import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FULL, SHORT, elasticOut, range } from '@/intro/script';
import { useExperience } from '@/state/experience';
import { world, addTrauma } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { clock, COLORS, fogUniforms, GLSL_FOG, GLSL_NOISE, glowTexture } from './fx';
import { emitSparks } from './Sparks';

const plasmaMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uEmber: { value: COLORS.ember }, uTide: { value: COLORS.tide }, uFusion: { value: COLORS.fusion } },
    vertexShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime;
      varying vec3 vObj; varying vec3 vN; varying vec3 vW;
      void main(){
        vObj = normalize(position);
        float d = snoise(vObj * 2.2 + vec3(0.0, uTime * 0.6, 0.0)) * 0.06;
        vec3 p = position + normal * d;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime; uniform float uPulse;
      uniform vec3 uEmber; uniform vec3 uTide; uniform vec3 uFusion;
      varying vec3 vObj; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(normalize(vN), V), 0.0);
        vec3 q = vObj * 1.6;
        float n = fbm(q + vec3(uTime * 0.12, uTime * 0.2, 0.0));
        float n2 = fbm(q * 2.1 - vec3(0.0, uTime * 0.35, uTime * 0.1) + n);
        float split = smoothstep(-0.45, 0.45, vObj.x * 0.9 + n * 0.9);
        vec3 col = mix(uEmber, uTide, split);
        col = mix(col, uFusion * 1.3, smoothstep(0.1, 0.65, n2) * 0.65);
        float core = pow(1.0 - f, 3.0);
        col = col * (1.4 + 2.2 * uPulse) + vec3(1.0, 0.95, 0.9) * core * (0.9 + 2.5 * uPulse);
        col += smoothstep(0.35, 0.9, n2) * 0.8;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

const tickRingMaterial = (color: THREE.Color, dashes: number, inner: number, outer: number) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: color }, uDashes: { value: dashes }, uAlpha: { value: 1 }, uInner: { value: inner }, uOuter: { value: outer }, ...fogUniforms },
    vertexShader: /* glsl */ `varying vec2 vP; varying float vDist; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FOG}
      uniform float uTime; uniform vec3 uColor; uniform float uDashes; uniform float uAlpha; uniform float uInner; uniform float uOuter;
      varying vec2 vP; varying float vDist;
      void main(){
        float ang = atan(vP.y, vP.x) / 6.2831853 + 0.5;
        float rad = (length(vP) - uInner) / (uOuter - uInner);
        float dash = step(0.62, fract(ang * uDashes - uTime * 0.15));
        float edge = smoothstep(0.0, 0.3, rad) * smoothstep(1.0, 0.7, rad);
        float sweep = pow(fract(ang - uTime * 0.07), 18.0) * 3.0;
        vec3 c = uColor * (dash * 1.6 + sweep + 0.12) * edge;
        gl_FragColor = vec4(applyFog(c, vDist) * uAlpha, 1.0);
      }`,
  });

export function Core({ tier }: { tier: number }) {
  const group = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const mote = useRef<THREE.Sprite>(null);
  const flash = useRef<THREE.Sprite>(null);
  const shock = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  const crystalGeo = useMemo(() => new THREE.IcosahedronGeometry(1.25, 0), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(crystalGeo), [crystalGeo]);
  const plasma = useMemo(() => plasmaMaterial(), []);
  const ticksA = useMemo(() => tickRingMaterial(COLORS.emberLight.clone().multiplyScalar(1.6), 48, 1.72, 1.78), []);
  const ticksB = useMemo(() => tickRingMaterial(COLORS.tideLight.clone().multiplyScalar(1.6), 72, 1.95, 1.985), []);
  const crystalMat = useMemo(() => {
    if (tier >= 3) {
      return new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 1,
        thickness: 1.6,
        roughness: 0.06,
        ior: 1.7,
        dispersion: 3.5,
        iridescence: 0.7,
        iridescenceIOR: 1.35,
        clearcoat: 1,
        attenuationColor: new THREE.Color('#c9b8ff'),
        attenuationDistance: 3,
        envMapIntensity: 1.6,
        flatShading: true,
        specularIntensity: 1,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: '#bda9ff',
      roughness: 0.04,
      metalness: 0.1,
      transparent: true,
      opacity: 0.32,
      iridescence: 0.8,
      clearcoat: 1,
      envMapIntensity: 2.2,
      flatShading: true,
      depthWrite: false,
    });
  }, [tier]);
  const edgeMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: new THREE.Color('#e6dcff').multiplyScalar(1.4), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  const shockMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uP; varying vec2 vUv;
          void main(){
            float r = length(vUv);
            float ring = exp(-pow((r - 0.8) * 22.0, 2.0));
            float inner = exp(-pow((r - 0.72) * 9.0, 2.0)) * 0.35;
            vec3 c = mix(vec3(0.62, 0.48, 1.0), vec3(1.0), ring) * (ring * 3.0 + inner);
            gl_FragColor = vec4(c * (1.0 - uP), 1.0);
          }`,
      }),
    [],
  );
  const glow = useMemo(() => glowTexture(), []);
  const state = useRef({ fused: false, burst: false, beats: 0, scanPulse: 0, hover: 0, clickPulse: 0, lastT: -1 });

  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    const phase = useExperience.getState().phase;
    const intro = world.intro;
    const s = intro.kind === 'full' ? FULL : SHORT;
    const t = intro.running ? intro.t : 1e4;
    const st = state.current;
    if (intro.running && t < st.lastT) {
      // replay: reset one-shot triggers
      st.fused = false;
      st.burst = false;
      st.beats = 0;
    }
    st.lastT = t;
    const gate = phase === 'gate';

    // ── Mote (Shot 00/01): breathes at the gate, beats twice, then bursts.
    const moteOn = intro.kind === 'full' && (gate || (intro.running && t < s.burst + 0.15));
    if (mote.current) {
      mote.current.visible = moteOn;
      if (moteOn) {
        let beat = 0;
        for (const b of [0.25, 0.47, 1.05, 1.27]) beat += Math.exp(-Math.pow((t - b) * 9, 2)) * (b > 1 ? 1.3 : 1);
        if (intro.running && st.beats < 2) {
          const next = [0.25, 1.05][st.beats];
          if (t >= next) {
            st.beats++;
            playSfx('heartbeat');
          }
        }
        const breathe = gate ? 0.5 + 0.5 * Math.sin(clock.t * 2.2) : 0;
        const approach = intro.running ? range(t, 1.3, s.burst) : 0;
        const sc = 0.22 + breathe * 0.06 + beat * 0.28 + approach * 0.5;
        mote.current.scale.setScalar(sc);
        (mote.current.material as THREE.SpriteMaterial).color.setRGB(3 + beat * 4, 1.6 + beat * 2, 0.8 + beat);
      }
    }
    if (intro.running && !st.burst && s.kind === 'full' && t >= s.burst) {
      st.burst = true;
      addTrauma(0.35);
      emitSparks({ count: 260, origin: [0, 0, 0], color: COLORS.emberLight, speed: [3, 14], life: [0.6, 1.8], intensity: 5, drag: 1.2, gravity: 0 });
      playSfx('whoosh');
      playSfx('glitch');
    }

    // ── Crystal growth at the fusion
    let grow = 1;
    if (intro.running) grow = elasticOut(range(t, s.fusion, s.fusion + 1.15));
    else if (gate && intro.kind === 'full') grow = 0;
    if (intro.running && !st.fused && t >= s.fusion) {
      st.fused = true;
      addTrauma(s.kind === 'full' ? 0.95 : 0.4);
      emitSparks({ count: s.kind === 'full' ? 900 : 300, origin: [0, 0, 0], color: COLORS.fusionLight, speed: [4, 22], life: [0.8, 2.6], intensity: 5, drag: 0.9, gravity: -0.6, size: [0.05, 0.2] });
      emitSparks({ count: 200, origin: [0, 0, 0], color: COLORS.emberLight, speed: [2, 12], life: [0.6, 2], intensity: 4, gravity: -1 });
      emitSparks({ count: 200, origin: [0, 0, 0], color: COLORS.tideLight, speed: [2, 12], life: [0.6, 2], intensity: 4, gravity: -1 });
      playSfx('impact');
    }
    const fusionAge = intro.running ? t - s.fusion : 99;

    // Flash + shockwave billboard, face the camera
    if (flash.current) {
      const f = fusionAge >= 0 && fusionAge < 1.2 ? Math.exp(-fusionAge * 3.2) : 0;
      flash.current.visible = f > 0.01;
      flash.current.scale.setScalar(4 + (1 - f) * 22);
      (flash.current.material as THREE.SpriteMaterial).opacity = f;
    }
    if (shock.current) {
      const p = fusionAge >= 0 && fusionAge < 2.4 ? Math.min(1, fusionAge / 2.4) : 1;
      shock.current.visible = p < 1;
      shock.current.quaternion.copy(camera.quaternion);
      shock.current.scale.setScalar(1 + Math.pow(p, 0.55) * 34);
      shockMat.uniforms.uP.value = p;
    }

    // Scan ignite pulse
    const scanOn = intro.running && s.kind === 'full' ? Math.exp(-Math.pow((t - s.scan) * 3, 2)) : 0;
    // Hover / click interaction (screen-space distance to the core)
    const v = new THREE.Vector3(0, 0, 0).project(camera);
    const dx = (v.x - world.pointer.x) * (size.width / size.height);
    const dy = v.y - world.pointer.y;
    const near = phase === 'site' && world.station === 'core' && Math.hypot(dx, dy) < 0.28 ? 1 : 0;
    st.hover += (near - st.hover) * Math.min(1, clock.dt * 5);
    st.clickPulse = Math.max(0, st.clickPulse - clock.dt * 1.5);
    const pulse = scanOn * 1.4 + 0.18 * (0.5 + 0.5 * Math.sin(clock.t * 1.7)) + st.hover * 0.5 + st.clickPulse;

    g.visible = grow > 0.001 || moteOn || fusionAge < 3;
    const crystalGroup = crystal.current?.parent;
    if (crystalGroup) {
      crystalGroup.scale.setScalar(Math.max(0.0001, grow));
      crystalGroup.rotation.y += clock.dt * (0.18 + st.hover * 0.6);
      crystalGroup.rotation.x = Math.sin(clock.t * 0.3) * 0.25;
      crystalGroup.position.y = Math.sin(clock.t * 0.8) * 0.08;
    }
    plasma.uniforms.uTime.value = clock.t;
    plasma.uniforms.uPulse.value = pulse;
    edgeMat.opacity = 0.35 + pulse * 0.5;
    ticksA.uniforms.uTime.value = clock.t;
    ticksB.uniforms.uTime.value = -clock.t * 0.8;
    ticksA.uniforms.uAlpha.value = grow;
    ticksB.uniforms.uAlpha.value = grow;
    if (ringA.current) {
      ringA.current.rotation.z += clock.dt * 0.1;
    }
    if (ringB.current) ringB.current.rotation.z -= clock.dt * 0.07;
    if (light.current) light.current.intensity = (6 + pulse * 30) * grow;
  });

  const onClick = () => {
    state.current.clickPulse = 1.2;
    addTrauma(0.15);
    emitSparks({ count: 120, origin: [0, 0, 0], color: COLORS.fusionLight, speed: [2, 8], life: [0.5, 1.4], intensity: 4, gravity: 0 });
    playSfx('shimmer', { gain: 0.6 });
  };

  return (
    <group ref={group}>
      <sprite ref={mote} scale={0.3}>
        <spriteMaterial map={glow} color="#ffffff" blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} transparent />
      </sprite>
      <group onClick={onClick}>
        <mesh ref={crystal} geometry={crystalGeo} material={crystalMat} renderOrder={2} />
        <lineSegments geometry={edgesGeo} material={edgeMat} scale={1.002} />
        <mesh material={plasma}>
          <sphereGeometry args={[0.66, 64, 48]} />
        </mesh>
        <mesh ref={ringA} rotation={[Math.PI / 2 + 0.25, 0, 0]} material={ticksA}>
          <ringGeometry args={[1.72, 1.78, 256, 1]} />
        </mesh>
        <mesh ref={ringB} rotation={[Math.PI / 2 - 0.5, 0.35, 0]} material={ticksB}>
          <ringGeometry args={[1.95, 1.985, 256, 1]} />
        </mesh>
        <pointLight ref={light} color="#b49cff" intensity={8} distance={14} decay={1.6} />
      </group>
      <sprite ref={flash} visible={false}>
        <spriteMaterial map={glow} color={new THREE.Color(4, 3.6, 5)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} transparent />
      </sprite>
      <mesh ref={shock} material={shockMat} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { FULL, SHORT } from '@/intro/script';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { playSfx, setAudioEnabled, startDrone } from '@/audio/engine';
import { clearSparks } from './Sparks';
import { introStats } from './Packets';

/** Starts, replays, skips and hands off the intro film; reports loading progress for the gate. */
export function Conductor() {
  const { gl, scene, camera } = useThree();
  const setLoad = useExperience((s) => s.setLoad);
  const setWorldReady = useExperience((s) => s.setWorldReady);
  const frames = useRef(0);
  const ready = useRef(false);

  // Real loading progress: fonts → shader compilation → first frames.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoad(0.15);
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
      } catch {
        /* ignore */
      }
      if (!alive) return;
      setLoad(0.5);
      try {
        const compileAsync = (gl as unknown as { compileAsync?: (s: unknown, c: unknown) => Promise<void> }).compileAsync;
        if (compileAsync) await Promise.race([compileAsync.call(gl, scene, camera), new Promise((r) => setTimeout(r, 4000))]);
      } catch {
        /* ignore */
      }
      if (!alive) return;
      setLoad(0.85);
      ready.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, setLoad]);

  // ?debug exposes window.__viczo for automated visual checks.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    (window as unknown as { __viczo: unknown }).__viczo = {
      seek: (t: number) => {
        world.intro.t = t;
      },
      state: () => ({ phase: useExperience.getState().phase, t: world.intro.t, running: world.intro.running, tier: useExperience.getState().tier }),
      world,
    };
  }, []);

  // React to phase changes.
  useEffect(() => {
    const apply = (phase: string, prev?: string) => {
      const ex = useExperience.getState();
      if (phase === 'intro' && prev !== 'intro') {
        world.intro.kind = ex.introKind;
        world.intro.t = 0;
        world.intro.running = true;
        world.intro.done = false;
        world.intro.epoch++;
        introStats.masks = 0;
        clearSparks();
        setAudioEnabled(ex.sound);
        if (ex.sound) startDrone();
      }
      if (phase === 'site' && world.intro.running) {
        const s = world.intro.kind === 'full' ? FULL : SHORT;
        // A skip jumps straight to the end state; a natural handoff lets the film tail finish.
        if (world.intro.t < s.handoff - 0.05) {
          world.intro.running = false;
          world.intro.done = true;
        }
      }
      if (phase === 'site' && prev === undefined) {
        world.intro.running = false;
        world.intro.done = true;
      }
    };
    apply(useExperience.getState().phase);
    return useExperience.subscribe((s, p) => {
      if (s.phase !== p.phase) apply(s.phase, p.phase);
      if (s.sound !== p.sound) {
        setAudioEnabled(s.sound);
        if (s.sound) startDrone();
      }
    });
  }, []);

  useFrame(() => {
    frames.current++;
    if (ready.current && frames.current > 3 && !useExperience.getState().worldReady) setWorldReady();
    const intro = world.intro;
    if (!intro.running) return;
    const s = intro.kind === 'full' ? FULL : SHORT;
    const ex = useExperience.getState();
    if (ex.phase === 'intro' && intro.t >= s.handoff) {
      ex.finishIntro();
      playSfx('hit', { gain: 0.5 });
    }
    if (intro.t >= s.duration) {
      intro.running = false;
      intro.done = true;
    }
  });

  return null;
}

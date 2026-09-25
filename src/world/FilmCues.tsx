import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { FULL, SHORT } from '@/intro/script';
import { world } from '@/state/world';
import { duck, playSfx } from '@/audio/engine';

/** One-shot sound cues of the film that do not belong to a single set piece. */
export function FilmCues() {
  const fired = useRef(new Set<string>());
  const last = useRef(-1);
  useFrame(() => {
    const intro = world.intro;
    if (!intro.running) return;
    const t = intro.t;
    if (t < last.current) fired.current.clear();
    last.current = t;
    const s = intro.kind === 'full' ? FULL : SHORT;
    const cue = (id: string, at: number, run: () => void) => {
      if (at >= 0 && t >= at && !fired.current.has(id)) {
        fired.current.add(id);
        run();
      }
    };
    cue('dread', s.maskGather, () => playSfx('riserMask'));
    // the lunge ends in a hard cut to black and dead air
    cue('blackout', s.blackout + 0.05, () => duck(0.02, 0.5));
    // after the climax: the world holds its breath, one heartbeat
    cue('hush', s.silence, () => duck(0.18, 1.1));
    cue('beat', s.silence + 0.55, () => playSfx('heartbeat', { gain: 0.8 }));
    cue('credit', s.credit, () => playSfx('credit'));
  });
  return null;
}

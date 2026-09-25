/**
 * Mutable, per-frame world state shared between the DOM and the WebGL scene.
 * Deliberately NOT React state: the render loop reads it 60×/s without re-rendering components.
 */
import type { StationId } from '@/world/stations';
import type { Composition, Verdict } from '@/sentinel/types';

export const world = {
  /** Base station for the current route. */
  station: 'core' as StationId,
  /** Home page scroll path: blend between two stations. */
  path: { from: 'core' as StationId, to: 'core' as StationId, t: 0, active: false },
  pointer: { x: 0, y: 0 },
  /** Smoothed scroll velocity in px/frame, used for chromatic aberration. */
  scrollVelocity: 0,
  /** Target glitch intensity for masks (0..1). */
  glitch: 0,
  /** Camera shake trauma (0..1), decays automatically. */
  trauma: 0,
  intro: { t: 0, sim: 0, timeScale: 1, running: false, kind: 'full' as 'full' | 'short', done: false, epoch: 0 },
  scan: {
    active: false,
    stage: 'idle' as string,
    /** 0..1 */
    progress: 0,
    verdict: null as Verdict | null,
    score: 0,
    composition: null as Composition | null,
    explode: 0,
  },
  quarantine: { neutralized: 0, released: 0 },
  /** Detail pages: tint of the focused listing. */
  focusTint: null as null | 'ember' | 'tide',
};

export function addTrauma(v: number) {
  world.trauma = Math.min(1, world.trauma + v);
}

import { useEffect, useRef } from 'react';
import { world } from '@/state/world';
import { HOME_PATH, type StationId } from '@/world/stations';

/** Sets the camera station for a page while it is mounted. */
export function useStation(id: StationId, extra?: () => void | (() => void)) {
  useEffect(() => {
    world.station = id;
    world.path.active = false;
    const cleanup = extra?.();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

/**
 * Home page scroll path: each chapter element owns a station; the camera sits on a chapter's station
 * for most of the chapter and cranes to the next one during its last stretch.
 */
export function useHomePath(chapters: React.RefObject<(HTMLElement | null)[]>) {
  const raf = useRef(0);
  useEffect(() => {
    world.station = 'core';
    world.path.active = true;
    const tick = () => {
      const els = chapters.current ?? [];
      const mid = window.innerHeight * 0.55;
      let from: StationId = 'core';
      let to: StationId = 'core';
      let t = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          const local = (mid - r.top) / r.height;
          from = HOME_PATH[i];
          to = HOME_PATH[Math.min(i + 1, HOME_PATH.length - 1)];
          const hold = el.dataset.hold ? Number(el.dataset.hold) : 0.62;
          const k = Math.max(0, (local - hold) / (1 - hold));
          t = k * k * (3 - 2 * k);
          break;
        }
        if (i === els.length - 1 && r.bottom <= mid) {
          from = to = HOME_PATH[i];
        }
      }
      world.path.from = from;
      world.path.to = to;
      world.path.t = t;
      // masks glitch while "The Noise" chapter is on screen
      const inNoise = from === 'noise' || (to === 'noise' && t > 0.4);
      world.glitch = inNoise ? 1 : 0;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      world.path.active = false;
      world.glitch = 0;
    };
  }, [chapters]);
}

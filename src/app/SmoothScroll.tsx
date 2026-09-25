import Lenis from 'lenis';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';

let lenis: Lenis | null = null;

export function scrollToEl(el: Element | null, offset = -90) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset, duration: 1.6 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

export function scrollToTop(immediate = false) {
  if (lenis) lenis.scrollTo(0, { immediate, duration: 1.4 });
  else window.scrollTo({ top: 0 });
}

/** Lenis smooth scrolling + scroll velocity for the camera, locked while the film plays. */
export function SmoothScroll() {
  const phase = useExperience((s) => s.phase);
  const reduced = useExperience((s) => s.reducedMotion);
  const { pathname } = useLocation();

  useEffect(() => {
    if (reduced) return;
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis?.raf(t);
      world.scrollVelocity = lenis?.velocity ?? 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (phase === 'site') lenis?.start();
    else lenis?.stop();
    document.documentElement.style.overflow = phase === 'site' ? '' : 'hidden';
  }, [phase]);

  useEffect(() => {
    scrollToTop(true);
  }, [pathname]);

  return null;
}

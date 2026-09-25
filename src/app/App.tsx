import { AnimatePresence, motion } from 'motion/react';
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { IntroOverlay } from '@/intro/IntroOverlay';
import { CommandPalette } from '@/components/CommandPalette';
import { Nav } from '@/components/Nav';
import { SmoothScroll } from './SmoothScroll';

const WorldCanvas = lazy(() => import('@/world/WorldCanvas').then((m) => ({ default: m.WorldCanvas })));
const Home = lazy(() => import('@/pages/Home'));
const Scan = lazy(() => import('@/pages/Scan'));
const AppDetail = lazy(() => import('@/pages/AppDetail'));
const SiteDetail = lazy(() => import('@/pages/SiteDetail'));
const Upload = lazy(() => import('@/pages/Upload'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const IntroReplay = lazy(() => import('@/pages/IntroReplay'));

function PointerTracker() {
  useEffect(() => {
    const on = (e: PointerEvent) => {
      world.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      world.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);
  return null;
}

/** Static backdrop for devices without usable WebGL. */
function FlatWorld() {
  return (
    <div aria-hidden className="grain fixed inset-0 -z-0" style={{ background: 'radial-gradient(60% 50% at 75% 35%, rgba(155,123,255,0.22), transparent 70%), radial-gradient(40% 40% at 15% 80%, rgba(255,107,44,0.14), transparent 70%), radial-gradient(40% 40% at 90% 90%, rgba(41,211,255,0.12), transparent 70%), #07060a' }} />
  );
}

function Routed() {
  const location = useLocation();
  const phase = useExperience((s) => s.phase);
  return (
    <div className="relative z-10 transition-opacity duration-700" style={{ opacity: phase === 'site' ? 1 : 0, pointerEvents: phase === 'site' ? undefined : 'none' }} aria-hidden={phase !== 'site'}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/app/:slug" element={<AppDetail />} />
              <Route path="/website/:slug" element={<SiteDetail />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/intro" element={<IntroReplay />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function App() {
  const tier = useExperience((s) => s.tier);
  return (
    <BrowserRouter>
      <a href="#main" className="sr-only z-[100] rounded bg-ink px-3 py-2 text-void focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <PointerTracker />
      <SmoothScroll />
      {tier > 0 ? (
        <Suspense fallback={null}>
          <WorldCanvas />
        </Suspense>
      ) : (
        <FlatWorld />
      )}
      <Nav />
      <Routed />
      <IntroOverlay />
      <CommandPalette />
    </BrowserRouter>
  );
}

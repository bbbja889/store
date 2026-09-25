import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { introStats } from '@/world/Packets';
import { serpentHeads } from '@/world/Serpents';
import { FULL, SHORT, range } from './script';

const SHOTS = [
  { at: 0, label: '01 — Pulse' },
  { at: FULL.burst, label: '02 — The Noise' },
  { at: FULL.serpents, label: '03 — Two Fires' },
  { at: FULL.breath, label: '04 — Fusion' },
  { at: FULL.scan, label: '05 — The Sentinel' },
  { at: FULL.name, label: '06 — The Name' },
  { at: FULL.dissolve, label: '07 — Arrival' },
];

function Gate() {
  const load = useExperience((s) => s.load);
  const ready = useExperience((s) => s.worldReady);
  const enter = useExperience((s) => s.enter);
  const skip = useExperience((s) => s.skipIntro);
  const kind = useExperience((s) => s.introKind);
  const first = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((v) => {
        const target = load * 100;
        const next = v + (target - v) * 0.25;
        return target - next < 0.6 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [load]);
  useEffect(() => {
    if (ready) first.current?.focus({ preventScroll: true });
  }, [ready]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-4"
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      role="dialog"
      aria-label="Enter VICZO"
    >
      {/* the thin line from the original v1 intro, now the gate's horizon */}
      <motion.div
        className="absolute left-0 right-0 top-1/2 h-px origin-center"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,44,0.7), rgba(155,123,255,0.7), rgba(41,211,255,0.7), transparent)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, ease: [0.77, 0, 0.175, 1] }}
      />
      <div className="relative mt-[34vh] flex w-full max-w-md flex-col items-center gap-6 text-center">
        <p className="hud text-ink-3">
          VICZO / SENTINEL — {ready ? 'world assembled' : 'assembling the world'}
        </p>
        <p className="font-mono text-4xl tabular-nums tracking-[0.2em] text-ink" aria-live="polite">
          {String(Math.round(Math.min(100, shown))).padStart(3, '0')}
        </p>
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
            >
              <button
                ref={first}
                onClick={() => enter(true)}
                className="group relative overflow-hidden rounded-full border border-ember/50 bg-ember/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ink transition hover:bg-ember/25"
              >
                <span className="relative z-10">Enter with sound</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
              <button
                onClick={() => enter(false)}
                className="rounded-full border border-white/15 px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ink-2 transition hover:border-white/35 hover:text-ink"
              >
                Enter in silence
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="max-w-xs text-xs text-ink-3">
          {kind === 'full' ? 'A 16-second film. Headphones recommended.' : 'Welcome back.'}{' '}
          <button onClick={skip} className="underline decoration-white/20 underline-offset-4 hover:text-ink-2">
            Skip intro
          </button>
        </p>
      </div>
    </motion.div>
  );
}

function Film() {
  const kind = useExperience((s) => s.introKind);
  const phase = useExperience((s) => s.phase);
  const skip = useExperience((s) => s.skipIntro);
  const script = kind === 'full' ? FULL : SHORT;
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const packets = useRef<HTMLSpanElement>(null);
  const masks = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const ember = useRef<HTMLDivElement>(null);
  const tide = useRef<HTMLDivElement>(null);
  const store = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [shot, setShot] = useState(SHOTS[0].label);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  useEffect(() => {
    let raf = 0;
    let lastCaption: string | null = null;
    let lastShot = '';
    const tick = () => {
      const intro = world.intro;
      const t = intro.running ? intro.t : script.duration;
      // Letterbox 2.39:1, retracting at the handoff
      const out = range(t, script.letterboxOut, script.letterboxOut + 1.1);
      const ease = out * out * (3 - 2 * out);
      const bar = window.innerWidth / window.innerHeight > 1.2 ? Math.max(0, (window.innerHeight - window.innerWidth / 2.39) / 2) : window.innerHeight * 0.1;
      const h = bar * (1 - ease);
      if (top.current) top.current.style.height = `${h}px`;
      if (bottom.current) bottom.current.style.height = `${h}px`;
      // Flash frames on the fusion and the blade
      const f = kind === 'full' ? Math.max(Math.exp(-Math.pow((t - FULL.fusion - 0.02) * 7, 2)), 0.28 * Math.exp(-Math.pow((t - FULL.slice - 0.22) * 14, 2))) : Math.exp(-Math.pow((t - SHORT.fusion) * 7, 2)) * 0.6;
      if (flash.current) flash.current.style.opacity = String(f);
      // HUD counters
      if (packets.current) packets.current.textContent = String(introStats.packets).padStart(4, '0');
      if (masks.current) masks.current.textContent = String(introStats.masks).padStart(3, '0');
      if (status.current) status.current.textContent = t < FULL.scan ? 'ARMED' : t < FULL.scanEnd ? 'SWEEPING' : 'CLEAR';
      // Serpent tags follow the heads
      const place = (el: HTMLDivElement | null, ndc: { x: number; y: number; z: number }) => {
        if (!el) return;
        const vis = serpentHeads.visible * (ndc.z < 1 ? 1 : 0);
        el.style.opacity = String(vis);
        el.style.transform = `translate(${((ndc.x + 1) / 2) * window.innerWidth}px, ${((1 - ndc.y) / 2) * window.innerHeight}px)`;
      };
      place(ember.current, serpentHeads.emberNdc);
      place(tide.current, serpentHeads.tideNdc);
      // STORE + tagline under the particle title
      if (store.current) {
        const a = range(t, FULL.slice + 0.1, FULL.slice + 0.8) * (1 - range(t, FULL.dissolve, FULL.dissolve + 0.6));
        store.current.style.opacity = String(kind === 'full' ? a : 0);
        store.current.style.letterSpacing = `${0.9 - a * 0.45}em`;
      }
      const cap = script.captions.find((c) => t >= c.at && t < c.until)?.text ?? null;
      if (cap !== lastCaption) {
        lastCaption = cap;
        setCaption(cap);
      }
      const sh = [...SHOTS].reverse().find((s) => t >= s.at)?.label ?? SHOTS[0].label;
      if (sh !== lastShot) {
        lastShot = sh;
        setShot(sh);
      }
      if (!intro.running && phase === 'site') {
        setGone(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, phase, script]);

  if (gone) return null;
  const inFilm = phase === 'intro';
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      <div ref={flash} className="absolute inset-0 bg-white opacity-0 mix-blend-screen" />
      <div ref={top} className="absolute left-0 right-0 top-0 bg-black">
        {inFilm && kind === 'full' && (
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between sm:left-8 sm:right-8">
            <span className="hud text-ink-3">{shot}</span>
            <span className="hud hidden gap-5 text-ink-3 sm:flex">
              <span>
                Packets in range <span ref={packets} className="text-ink-2">0000</span>
              </span>
              <span>
                Masks detected <span ref={masks} className="text-danger">000</span>
              </span>
              <span>
                Sentinel <span ref={status} className="text-tide">ARMED</span>
              </span>
            </span>
          </div>
        )}
      </div>
      <div ref={bottom} className="absolute bottom-0 left-0 right-0 bg-black">
        {inFilm && (
          <div className="absolute left-4 right-4 top-3 flex items-start justify-between gap-4 sm:left-8 sm:right-8">
            <AnimatePresence mode="wait">
              {caption ? (
                <motion.p
                  key={caption}
                  initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-xl font-mono text-[11px] leading-relaxed tracking-[0.08em] text-ink-2 sm:text-sm"
                >
                  {caption}
                </motion.p>
              ) : (
                <span />
              )}
            </AnimatePresence>
            <button
              onClick={skip}
              className="pointer-events-auto hud shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-ink-3 transition hover:border-white/40 hover:text-ink"
            >
              Skip · Esc
            </button>
          </div>
        )}
      </div>
      {kind === 'full' && (
        <>
          <div ref={ember} className="absolute left-0 top-0 opacity-0" style={{ willChange: 'transform' }}>
            <div className="ml-6 -mt-3 whitespace-nowrap border-l border-ember/70 pl-2">
              <p className="hud text-ember">Ember</p>
              <p className="text-[11px] text-ink-2">the makers of apps</p>
            </div>
          </div>
          <div ref={tide} className="absolute left-0 top-0 opacity-0" style={{ willChange: 'transform' }}>
            <div className="ml-6 -mt-3 whitespace-nowrap border-l border-tide/70 pl-2">
              <p className="hud text-tide">Tide</p>
              <p className="text-[11px] text-ink-2">the builders of the web</p>
            </div>
          </div>
          <div ref={store} className="absolute left-0 right-0 top-[64%] text-center opacity-0">
            <p className="font-display text-sm font-light uppercase text-ember-light sm:text-lg">Store</p>
            <p className="serif-accent mt-3 text-base text-ink-2 sm:text-xl" style={{ letterSpacing: 'normal' }}>
              Apps &amp; Sites. X-rayed. All in one place.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function IntroOverlay() {
  const phase = useExperience((s) => s.phase);
  const [filmMounted, setFilmMounted] = useState(phase === 'intro');
  useEffect(() => {
    if (phase === 'intro') setFilmMounted(true);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'site') return;
    const id = window.setInterval(() => {
      if (!world.intro.running) {
        setFilmMounted(false);
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  return (
    <>
      <AnimatePresence>{phase === 'gate' && <Gate key="gate" />}</AnimatePresence>
      {filmMounted && <Film />}
    </>
  );
}

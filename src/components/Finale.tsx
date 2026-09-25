import { motion, useInView } from 'motion/react';
import { Film } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useExperience } from '@/state/experience';
import { playSfx } from '@/audio/engine';

/** Letters forged from embers, then cut by a vertical blade of light — the end.mp4 homage. */
function Forged({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [cut, setCut] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const a = window.setTimeout(() => {
      setCut(true);
      playSfx('blade');
    }, 1500);
    return () => window.clearTimeout(a);
  }, [inView]);
  return (
    <div ref={ref} className="relative inline-block select-none">
      <h2 className="display relative text-[clamp(3.2rem,13vw,11rem)] leading-none" aria-label={text}>
        {text.split('').map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block"
            initial={{ opacity: 0, y: 40, filter: 'blur(14px)' }}
            animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 1.1, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
            style={{
              backgroundImage: 'linear-gradient(180deg, #fff6d6 0%, #ffb070 30%, #ff6b2c 62%, #7a1c00 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 18px rgba(255,107,44,0.55)) drop-shadow(0 0 60px rgba(255,80,20,0.35))',
            }}
          >
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </h2>
      {/* the blade */}
      <motion.div
        className="pointer-events-none absolute -bottom-6 -top-6 w-[3px] rounded-full"
        style={{ background: 'linear-gradient(180deg, transparent, #fff 20%, #ffcfb0 50%, #fff 80%, transparent)', boxShadow: '0 0 24px 6px rgba(255,120,60,0.8), 0 0 80px 20px rgba(255,60,20,0.45)' }}
        initial={{ left: '-4%', opacity: 0 }}
        animate={cut ? { left: ['-4%', '104%'], opacity: [0, 1, 1, 0] } : {}}
        transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ background: 'radial-gradient(closest-side, rgba(255,240,220,0.9), transparent)' }}
        initial={{ opacity: 0 }}
        animate={cut ? { opacity: [0, 0.8, 0] } : {}}
        transition={{ duration: 0.7, delay: 0.3 }}
      />
    </div>
  );
}

export function Finale() {
  const replay = useExperience((s) => s.replayIntro);
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 flex min-h-[100svh] flex-col justify-between overflow-hidden pt-28" data-hold="1">
      <div className="container-x text-center">
        <p className="hud text-ink-3">End of transmission</p>
        <p className="serif-accent mx-auto mt-6 max-w-2xl text-2xl text-ink-2 sm:text-3xl">Every app. Every link. Seen through, before it reaches you.</p>
      </div>
      <div className="relative flex flex-col items-center px-4 text-center">
        <p className="hud mb-4 text-ember-light">Crafted by</p>
        <Forged text="YASHRAJ" />
        <p className="hud mt-6 text-ink-3">Yashraj Ghemud · VICZO</p>
        <button
          onClick={replay}
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-void/40 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-2 backdrop-blur transition hover:border-ember/60 hover:text-ink"
        >
          <Film className="h-3.5 w-3.5" /> Replay the intro
        </button>
      </div>
      <div className="container-x flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-ink-3 sm:flex-row">
        <p>© {year} VICZO Store. Sentinel runs on your device — 0 bytes of your files uploaded.</p>
        <nav className="flex gap-5" aria-label="Footer">
          <Link to="/scan" className="hover:text-ink">Sentinel</Link>
          <Link to="/upload" className="hover:text-ink">Publish</Link>
          <a href="https://github.com/bbbja889/store" className="hover:text-ink" target="_blank" rel="noreferrer">Source</a>
        </nav>
      </div>
    </footer>
  );
}

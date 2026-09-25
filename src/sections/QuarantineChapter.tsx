import { MousePointerClick } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useExperience } from '@/state/experience';
import { world } from '@/state/world';
import { Eyebrow } from '@/components/ui';

export function QuarantineChapter() {
  const tier = useExperience((s) => s.tier);
  const [stats, setStats] = useState({ n: 0, r: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setStats({ n: world.quarantine.neutralized, r: world.quarantine.released }), 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <section className="relative flex min-h-[125svh] flex-col justify-between py-28" aria-labelledby="q-title" data-hold="0.72">
      <div className="container-x">
        <div className="max-w-xl">
          <Eyebrow tone="ember">Chapter 03 — Quarantine</Eyebrow>
          <h2 id="q-title" className="display mt-5 text-[clamp(2rem,4.6vw,3.9rem)]">
            Try being the <span className="serif-accent font-normal tracking-normal text-ember">Sentinel.</span>
          </h2>
          <p className="mt-5 text-ink-2">
            Packages are falling into quarantine — real rigid-body physics, pretend packages. {tier >= 2 ? 'Tap one to scan it. Masks shatter; clean ones are released.' : 'Interactive physics is switched off on this device to keep things smooth.'}
          </p>
        </div>
      </div>
      <div className="container-x flex flex-wrap items-end justify-between gap-4">
        <div className="glass-strong flex items-center gap-6 rounded-2xl px-5 py-4">
          <div>
            <p className="hud text-ink-3">Masks neutralised</p>
            <p className="font-display text-3xl font-bold tabular-nums text-danger">{String(stats.n).padStart(2, '0')}</p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <p className="hud text-ink-3">Released clean</p>
            <p className="font-display text-3xl font-bold tabular-nums text-safe">{String(stats.r).padStart(2, '0')}</p>
          </div>
        </div>
        {tier >= 2 && (
          <p className="hud flex items-center gap-2 text-ink-3">
            <MousePointerClick className="h-4 w-4 text-ember" /> Simulation · tap the tiles
          </p>
        )}
      </div>
    </section>
  );
}

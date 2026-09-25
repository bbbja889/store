import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Listing } from '@/data/types';
import { inspectLink } from '@/sentinel/url/inspect';
import { playSfx } from '@/audio/engine';
import { ListingIcon, SiteCover } from './ListingIcon';
import { TrustRing } from './TrustRing';
import { VerdictBadge } from './ui';

/** Catalog card with a physical feel: spring-driven 3D tilt and a glare that follows the cursor. */
export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 180, damping: 16 });
  const sry = useSpring(ry, { stiffness: 180, damping: 16 });
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(255,255,255,0.09), transparent 45%)`;

  const trust = useMemo(() => {
    if (listing.kind === 'app') return listing.passport ? { score: listing.passport.score, grade: listing.passport.grade, verdict: listing.passport.verdict } : null;
    const r = listing.link_report ?? inspectLink(listing.url);
    return { score: r.score, grade: r.grade, verdict: r.verdict };
  }, [listing]);

  const href = `/${listing.kind === 'app' ? 'app' : 'website'}/${listing.slug}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}>
        <Link
          ref={ref}
          to={href}
          onMouseEnter={() => playSfx('tick')}
          onPointerMove={(e) => {
            if (e.pointerType !== 'mouse') return;
            const r = ref.current!.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            ry.set((px - 0.5) * 10);
            rx.set(-(py - 0.5) * 10);
            gx.set(px * 100);
            gy.set(py * 100);
          }}
          onPointerLeave={() => {
            rx.set(0);
            ry.set(0);
          }}
          className="glass-strong group relative flex h-full flex-col overflow-hidden rounded-3xl transition-[border-color] duration-300 hover:border-white/20"
        >
          <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ background: glare }} />
          {listing.kind === 'site' && (
            <div className="relative aspect-[16/8] w-full overflow-hidden border-b border-white/10">
              <SiteCover listing={listing} className="transition-transform duration-700 group-hover:scale-105" />
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start gap-4">
              {listing.kind === 'app' && <ListingIcon listing={listing} size={54} />}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-bold tracking-tight transition-colors group-hover:text-ember-light">{listing.name}</h3>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {listing.category}
                  {listing.kind === 'app' && listing.version ? ` · v${listing.version}` : ''}
                  {listing.demo ? ' · demo' : ''}
                </p>
              </div>
              {trust ? <TrustRing {...trust} size={48} stroke={4} /> : <span className="hud text-[10px] text-ink-3">No passport</span>}
            </div>
            <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">{listing.tagline}</p>
            <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
              {trust ? <VerdictBadge verdict={trust.verdict} /> : <span />}
              <span className="flex items-center gap-1 text-xs text-ink-3 transition-colors group-hover:text-ink">
                {listing.kind === 'app' ? 'Passport' : 'Link X-ray'} <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

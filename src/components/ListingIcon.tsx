import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { Listing } from '@/data/types';

const HUES = {
  ember: ['#ff6b2c', '#ffb070'],
  tide: ['#29d3ff', '#8fe9ff'],
  fusion: ['#9b7bff', '#29d3ff'],
} as const;

function hueFor(l: Listing): keyof typeof HUES {
  if (l.hue) return l.hue;
  let h = 0;
  for (const c of l.slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (['ember', 'tide', 'fusion'] as const)[h % 3];
}

/** A listing's icon: the real one when it loads, otherwise a generated monogram tile. */
export function ListingIcon({ listing, className, size = 56 }: { listing: Listing; className?: string; size?: number }) {
  const src = listing.kind === 'app' ? listing.icon_url : undefined;
  const [broken, setBroken] = useState(false);
  const [a, b] = HUES[hueFor(listing)];
  const initials = listing.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-[22%] object-cover ring-1 ring-white/10', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn('relative shrink-0 overflow-hidden rounded-[22%] ring-1 ring-white/15', className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), transparent 55%)' }} />
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-void/85" style={{ fontSize: size * 0.36, letterSpacing: '-0.06em' }}>
        {initials}
      </span>
    </div>
  );
}

/** Generative cover for websites without a screenshot: domain, gradient mesh and scan lines. */
export function SiteCover({ listing, className }: { listing: Listing & { kind: 'site' }; className?: string }) {
  const [a, b] = HUES[hueFor(listing)];
  let host = listing.url;
  try {
    host = new URL(listing.url).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }
  if (listing.thumbnail_url) {
    return <img src={listing.thumbnail_url} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)} style={{ background: `radial-gradient(120% 90% at 10% 0%, ${a}55, transparent 60%), radial-gradient(100% 80% at 100% 100%, ${b}40, transparent 55%), #0d0b12` }}>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 4px)' }} />
      <div className="absolute left-4 top-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-white/20" />
        ))}
      </div>
      <p className="absolute bottom-3 left-4 right-4 truncate font-mono text-xs text-white/70">{host}</p>
      <p className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-2xl font-extrabold tracking-tight text-white/90">{listing.name}</p>
    </div>
  );
}

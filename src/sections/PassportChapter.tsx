import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { DEMO_APPS } from '@/data/demo';
import { lookupPermission } from '@/sentinel/knowledge/permissions';
import { colonHex, shortHash, bytes } from '@/lib/format';
import { ListingIcon } from '@/components/ListingIcon';
import { TrustRing } from '@/components/TrustRing';
import { Eyebrow, SEVERITY_STYLE, VerdictBadge } from '@/components/ui';

export function PassportChapter() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const raw = useTransform(scrollYProgress, [0.28, 0.62], [0, 180]);
  const rotateY = useSpring(raw, { stiffness: 70, damping: 18 });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -10]);
  const listing = DEMO_APPS.find((a) => a.slug === 'pocket-ledger')!;
  const p = listing.passport!;

  return (
    <section ref={ref} className="relative min-h-[170svh] py-28" aria-labelledby="passport-title" data-hold="0.7">
      <div className="container-x grid items-start gap-14 lg:grid-cols-2">
        <div className="lg:sticky lg:top-[18vh]">
          <Eyebrow tone="fusion">Chapter 04 — The Passport</Eyebrow>
          <h2 id="passport-title" className="display mt-5 text-[clamp(2rem,4.6vw,3.9rem)]">
            A nutrition label <span className="serif-accent font-normal tracking-normal text-fusion">for software.</span>
          </h2>
          <p className="mt-5 max-w-lg text-ink-2">
            Every listing in the Vault carries a Trust Passport: its score and the reasons behind it, what each permission really means, the trackers inside, who signed it and the file’s fingerprint.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-safe" />
              <span className="text-ink-2">
                <span className="text-ink">Not just good or bad.</span> Pocket Ledger reads your SMS to track spending — useful, and exactly what OTP stealers need. The passport says both.
              </span>
            </li>
            <li className="flex gap-3">
              <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-tide" />
              <span className="text-ink-2">
                <span className="text-ink">Verify your download.</span> After downloading, drop the file into Sentinel: the SHA-256 and signing certificate must match the passport. If a single byte changed, you’ll know.
              </span>
            </li>
          </ul>
        </div>

        <div className="flex justify-center py-10 lg:sticky lg:top-[12vh]" style={{ perspective: 1400 }}>
          <motion.div className="relative h-[520px] w-full max-w-[380px]" style={{ rotateY, rotateX, transformStyle: 'preserve-3d' }}>
            {/* front */}
            <div className="glass-strong absolute inset-0 flex flex-col rounded-[28px] p-6 shadow-[0_40px_120px_-30px_rgba(155,123,255,0.45)]" style={{ backfaceVisibility: 'hidden' }}>
              <div className="flex items-center justify-between">
                <p className="hud text-ink-3">Trust Passport</p>
                <p className="hud text-ink-3">{p.engine}</p>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <ListingIcon listing={listing} size={58} />
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold">{listing.name}</p>
                  <p className="truncate font-mono text-xs text-ink-3">{p.package_name}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <TrustRing score={p.score} grade={p.grade} verdict={p.verdict} size={112} />
                <div className="space-y-2">
                  <VerdictBadge verdict={p.verdict} />
                  <p className="text-xs text-ink-3">
                    v{p.version_name} · targets API {p.target_sdk} · {bytes(p.size_bytes)}
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.findings.filter((f) => f.severity !== 'good').slice(0, 4).map((f) => (
                  <li key={f.id} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_STYLE[f.severity].dot}`} />
                    <span className="text-ink-2">{f.title}</span>
                  </li>
                ))}
              </ul>
              <p className="hud mt-auto pt-4 text-[10px] text-ink-3">Keep scrolling — flip ↻</p>
            </div>
            {/* back */}
            <div className="glass-strong absolute inset-0 flex flex-col rounded-[28px] p-6" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <p className="hud text-ink-3">Identity & integrity</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="hud text-[10px] text-ink-3">File SHA-256</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-ink-2">{p.sha256}</dd>
                </div>
                <div>
                  <dt className="hud text-[10px] text-ink-3">Signing certificate</dt>
                  <dd className="mt-1 text-ink-2">{p.signature.cert_subject}</dd>
                  <dd className="mt-1 font-mono text-[11px] text-ink-3">{shortHash(colonHex(p.signature.cert_sha256 ?? ''), 23, 11)}</dd>
                </div>
                <div className="flex gap-6">
                  <div>
                    <dt className="hud text-[10px] text-ink-3">Schemes</dt>
                    <dd className="mt-1 text-ink-2">{p.signature.schemes.join(' · ')}</dd>
                  </div>
                  <div>
                    <dt className="hud text-[10px] text-ink-3">Signature</dt>
                    <dd className="mt-1 text-safe">{p.signature.verified ? 'Verified ✓' : '—'}</dd>
                  </div>
                </div>
                <div>
                  <dt className="hud text-[10px] text-ink-3">Permissions ({p.permissions.length})</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {p.permissions.map((n) => (
                      <span key={n} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-ink-2">
                        {lookupPermission(n)?.label ?? n.split('.').pop()}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="hud text-[10px] text-ink-3">Trackers ({p.trackers.length})</dt>
                  <dd className="mt-1 text-ink-2">{p.trackers.join(' · ') || 'none found'}</dd>
                </div>
              </dl>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

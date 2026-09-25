import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Download, ExternalLink, Fingerprint, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStation } from '@/app/useStation';
import { useListing } from '@/data/catalog';
import type { AppListing } from '@/data/types';
import { world } from '@/state/world';
import { VERDICT_COPY } from '@/sentinel/score';
import { androidName, bytes, colonHex, date } from '@/lib/format';
import { ListingIcon } from '@/components/ListingIcon';
import { CompositionBar, FindingList, KV, Panel, PermissionList } from '@/components/report';
import { TrustRing } from '@/components/TrustRing';
import { Button, ButtonLink, Eyebrow, VerdictBadge } from '@/components/ui';
import { TRACKERS } from '@/sentinel/knowledge/trackers';

function DownloadSheet({ app, onClose }: { app: AppListing; onClose: () => void }) {
  const p = app.passport;
  const href = app.download_url ?? (app.apk_url && app.apk_url !== '#' ? app.apk_url : undefined);
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-void/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div role="dialog" aria-label="Before you download" initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 26 }} className="glass-strong relative w-full max-w-lg rounded-3xl p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-3 hover:text-ink" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <p className="hud text-ink-3">Before you download</p>
        <div className="mt-4 flex items-center gap-4">
          {p ? <TrustRing score={p.score} grade={p.grade} verdict={p.verdict} size={84} stroke={6} /> : <ShieldAlert className="h-10 w-10 text-caution" />}
          <div>
            <p className="font-display text-xl font-bold">{app.name}</p>
            <p className="text-sm text-ink-2">{p ? VERDICT_COPY[p.verdict].line : 'This listing has no passport yet — X-ray the file yourself after downloading.'}</p>
          </div>
        </div>
        {p && (
          <ol className="mt-5 space-y-2 text-sm text-ink-2">
            <li>1. The file comes from the publisher’s own link — VICZO does not host binaries.</li>
            <li>2. After downloading, verify it: SHA-256 and signing certificate must match this passport.</li>
          </ol>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {href ? (
            <a href={href} download={href.startsWith('/') ? `${app.slug}.apk` : undefined} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer noopener" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ember px-5 py-3 text-sm font-medium text-void hover:bg-ember-light">
              <Download className="h-4 w-4" /> Download APK
            </a>
          ) : (
            <span className="flex-1 rounded-full border border-white/10 px-5 py-3 text-center text-sm text-ink-3">Demo listing — no binary attached</span>
          )}
          {p && (
            <ButtonLink to={`/scan?mode=verify&slug=${app.slug}`} variant="outline" className="flex-1">
              <Fingerprint className="h-4 w-4" /> Verify a download
            </ButtonLink>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AppDetail() {
  const { slug } = useParams();
  const { listing, loading } = useListing('app', slug);
  const app = listing as AppListing | null;
  const [sheet, setSheet] = useState(false);
  useStation('detail');
  useEffect(() => {
    world.focusTint = 'ember';
    return () => void (world.focusTint = null);
  }, []);

  if (!app) {
    return (
      <main id="main" className="container-x flex min-h-[80svh] flex-col items-start justify-center gap-4 pt-28">
        <p className="hud text-ink-3">{loading ? 'Opening the vault…' : 'Not in the vault'}</p>
        {!loading && (
          <ButtonLink to="/#vault" variant="outline">
            <ArrowLeft className="h-4 w-4" /> Back to the Vault
          </ButtonLink>
        )}
      </main>
    );
  }
  const p = app.passport;
  return (
    <main id="main" className="relative pb-24 pt-28">
      <div className="container-x">
        <Link to="/#vault" className="hud inline-flex items-center gap-2 text-ink-3 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Vault / Apps / {app.category}
        </Link>
        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
              <ListingIcon listing={app} size={112} className="shadow-[0_30px_80px_-20px_rgba(255,107,44,0.6)]" />
            </motion.div>
            <div>
              <Eyebrow tone="ember">{app.demo ? 'Demo listing' : app.developer_name ?? 'App'}</Eyebrow>
              <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.6rem)]">{app.name}</h1>
              <p className="mt-2 max-w-xl text-lg text-ink-2">{app.tagline}</p>
              <p className="mt-2 text-xs text-ink-3">
                {[app.version && `v${app.version}`, app.size_bytes && bytes(app.size_bytes), p?.min_sdk && `${androidName(p.min_sdk)}+`].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setSheet(true)}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <ButtonLink to={`/scan?mode=verify&slug=${app.slug}`} variant="outline" size="lg">
              <Fingerprint className="h-4 w-4" /> Verify
            </ButtonLink>
          </div>
        </section>

        {p ? (
          <section className="mt-12 space-y-4" aria-label="Trust Passport">
            <div className="glass-strong flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
              <TrustRing score={p.score} grade={p.grade} verdict={p.verdict} size={140} stroke={9} />
              <div className="flex-1">
                <p className="hud text-ink-3">Trust Passport · {p.engine} · scanned {date(p.scanned_at)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <VerdictBadge verdict={p.verdict} />
                  <span className="text-ink-2">{VERDICT_COPY[p.verdict].line}</span>
                </div>
                <p className="mt-3 max-w-2xl text-xs text-ink-3">Generated by Sentinel from the publisher’s build. Don’t take our word for it — verify your download and the fingerprints below must match.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Why this score">
                <FindingList findings={p.findings} />
              </Panel>
              <div className="space-y-4">
                <Panel title="Identity & seal">
                  <dl>
                    <KV k="Package" v={p.package_name} mono />
                    <KV k="Targets" v={androidName(p.target_sdk)} />
                    <KV k="Signature" v={`${p.signature.schemes.join(' · ') || 'unsigned'} · ${p.signature.verified ? 'verified ✓' : p.signature.verified === false ? 'BROKEN' : 'unchecked'}`} />
                    <KV k="Signer" v={p.signature.cert_subject ?? '—'} />
                    <KV k="Cert SHA-256" v={colonHex(p.signature.cert_sha256 ?? '')} mono />
                    <KV k="File SHA-256" v={p.sha256} mono />
                  </dl>
                </Panel>
                <Panel title={`Trackers · ${p.trackers.length}`}>
                  {p.trackers.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {p.trackers.map((id) => {
                        const t = TRACKERS.find((x) => x.id === id);
                        return (
                          <li key={id} className="rounded-full border border-caution/30 px-3 py-1 text-xs text-caution">
                            {t?.name ?? id} <span className="text-ink-3">· {t?.kind}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-safe">No known tracker SDKs.</p>
                  )}
                </Panel>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={`Permissions · ${p.permissions.length}`}>
                <PermissionList names={p.permissions} />
              </Panel>
              <div className="space-y-4">
                <Panel title="What's inside">
                  <CompositionBar composition={p.composition} />
                </Panel>
                <Panel title="About">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{app.description}</p>
                  {app.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {app.tags.map((t) => (
                        <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-ink-3">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-12 grid gap-4 lg:grid-cols-2">
            <Panel title="No passport yet">
              <p className="text-sm text-ink-2">This listing was published before Sentinel passports existed. Download it, then drop the file into Sentinel to see exactly what it contains.</p>
              <ButtonLink to="/scan" variant="tide" className="mt-4">
                <ExternalLink className="h-4 w-4" /> Open Sentinel
              </ButtonLink>
            </Panel>
            <Panel title="About">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{app.description}</p>
            </Panel>
          </section>
        )}
      </div>
      <AnimatePresence>{sheet && <DownloadSheet app={app} onClose={() => setSheet(false)} />}</AnimatePresence>
    </main>
  );
}

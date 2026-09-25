import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStation } from '@/app/useStation';
import { useListing } from '@/data/catalog';
import type { SiteListing } from '@/data/types';
import { inspectLink } from '@/sentinel/url/inspect';
import { date } from '@/lib/format';
import { SiteCover } from '@/components/ListingIcon';
import { KV, Panel } from '@/components/report';
import { Button, ButtonLink, Eyebrow, VerdictBadge } from '@/components/ui';
import { LinkReportView } from './Scan';

export default function SiteDetail() {
  const { slug } = useParams();
  const { listing, loading } = useListing('site', slug);
  const site = listing as SiteListing | null;
  const [leaving, setLeaving] = useState(false);
  useStation('detail');
  const report = useMemo(() => (site ? inspectLink(site.url) : null), [site]);

  if (!site || !report) {
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
  return (
    <main id="main" className="relative pb-24 pt-28">
      <div className="container-x">
        <Link to="/#vault" className="hud inline-flex items-center gap-2 text-ink-3 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Vault / Websites / {site.category}
        </Link>
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <Eyebrow tone="tide">{site.developer_name ?? 'Website'}</Eyebrow>
            <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.6rem)]">{site.name}</h1>
            <p className="mt-3 max-w-xl text-lg text-ink-2">{site.tagline}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="tide" size="lg" onClick={() => setLeaving(true)}>
                Visit site <ExternalLink className="h-4 w-4" />
              </Button>
              <VerdictBadge verdict={report.verdict} />
            </div>
          </div>
          <motion.div initial={{ opacity: 0, rotateY: -18, y: 20 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} style={{ transformPerspective: 1200 }} className="glass-strong aspect-[16/9] overflow-hidden rounded-3xl">
            <SiteCover listing={site} />
          </motion.div>
        </section>
        <section className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="hud mb-3 text-ink-3">Live Link X-ray</p>
            <LinkReportView report={report} />
          </div>
          <div className="space-y-4">
            <Panel title="About">
              <p className="text-sm leading-relaxed text-ink-2">{site.description}</p>
            </Panel>
            <Panel title="Details">
              <dl>
                <KV k="Address" v={site.url} mono />
                {site.tech_stack?.length ? <KV k="Built with" v={site.tech_stack.join(', ')} /> : null}
                <KV k="Listed" v={date(site.created_at)} />
              </dl>
            </Panel>
          </div>
        </section>
      </div>
      <AnimatePresence>
        {leaving && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-void/75 backdrop-blur-sm" onClick={() => setLeaving(false)} />
            <motion.div role="dialog" aria-label="Leaving VICZO" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-strong relative w-full max-w-md rounded-3xl p-6">
              <button onClick={() => setLeaving(false)} className="absolute right-4 top-4 text-ink-3 hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
              <p className="hud text-ink-3">You’re leaving VICZO for</p>
              <p className="mt-3 break-all font-mono text-2xl text-ink">{report.unicodeHost}</p>
              <p className="mt-2 text-sm text-ink-2">
                Registered domain <span className="text-ink">{report.registrable}</span> · {report.findings.filter((f) => ['critical', 'high', 'medium'].includes(f.severity)).length === 0 ? 'no disguises found' : 'see warnings on the listing'}
              </p>
              <a href={site.url} target="_blank" rel="noreferrer noopener" className="mt-6 flex items-center justify-center gap-2 rounded-full bg-tide px-5 py-3 text-sm font-medium text-void hover:bg-tide-light" onClick={() => setLeaving(false)}>
                Continue <ExternalLink className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

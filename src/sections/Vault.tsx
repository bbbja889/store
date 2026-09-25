import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { searchScore, useCatalog } from '@/data/catalog';
import type { Listing } from '@/data/types';
import { inspectLink } from '@/sentinel/url/inspect';
import { cn } from '@/lib/cn';
import { ListingCard } from '@/components/ListingCard';
import { SplitText } from '@/components/SplitText';
import { ButtonLink, Chip, Eyebrow } from '@/components/ui';

type Sort = 'trust' | 'new' | 'az';

function trustOf(l: Listing) {
  if (l.kind === 'app') return l.passport?.score ?? -1;
  return (l.link_report ?? inspectLink(l.url)).score;
}

export function Vault() {
  const { apps, sites, live, error, loading } = useCatalog();
  const [tab, setTab] = useState<'app' | 'site'>('app');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState<Sort>('trust');
  const list: Listing[] = tab === 'app' ? apps : sites;

  const categories = useMemo(() => ['All', ...Array.from(new Set(list.map((l) => l.category))).sort()], [list]);
  const items = useMemo(() => {
    const out = list
      .filter((l) => cat === 'All' || l.category === cat)
      .map((l) => ({ l, s: searchScore(l, q) }))
      .filter((x) => x.s > 0);
    out.sort((a, b) => {
      if (q.trim()) return b.s - a.s;
      if (sort === 'trust') return trustOf(b.l) - trustOf(a.l);
      if (sort === 'new') return +new Date(b.l.created_at) - +new Date(a.l.created_at);
      return a.l.name.localeCompare(b.l.name);
    });
    return out.map((x) => x.l);
  }, [list, cat, q, sort]);

  return (
    <section id="vault" className="relative min-h-[100svh] scroll-mt-24 py-28" aria-labelledby="vault-title" data-hold="0.9">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <Eyebrow tone="ember">Chapter 05 — The Vault</Eyebrow>
            <h2 id="vault-title" className="display mt-5 text-[clamp(2rem,4.8vw,4.1rem)]">
              <SplitText>Ranked by trust,</SplitText> <SplitText delay={0.2} className="serif-accent font-normal tracking-normal text-ember">not hype.</SplitText>
            </h2>
            <p className="mt-4 text-ink-2">Every app carries a Sentinel passport; every website gets a live Link X-ray. Open any listing to see exactly why it scored what it did.</p>
          </div>
          <p className="hud text-[10px] text-ink-3">{loading ? 'Connecting to the live catalog…' : live ? '● Live from Firestore + demo listings' : error ? `○ ${error}` : '○ Demo catalog'}</p>
        </div>

        <div className="glass-strong sticky top-20 z-20 mt-10 flex flex-col gap-3 rounded-3xl p-3 sm:top-24 md:flex-row md:items-center">
          <LayoutGroup id="vault-tabs">
            <div className="flex rounded-full bg-white/5 p-1" role="tablist" aria-label="Listing type">
              {(
                [
                  ['app', `Apps · ${apps.length}`],
                  ['site', `Websites · ${sites.length}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => {
                    setTab(k);
                    setCat('All');
                  }}
                  className={cn('relative flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors md:flex-none', tab === k ? 'text-void' : 'text-ink-2 hover:text-ink')}
                >
                  {tab === k && <motion.span layoutId="tab-pill" className={cn('absolute inset-0 rounded-full', k === 'app' ? 'bg-ember' : 'bg-tide')} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <label className="flex flex-1 items-center gap-2 rounded-full bg-white/5 px-4 py-2.5">
            <Search className="h-4 w-4 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'app' ? 'Search apps, packages, tags…' : 'Search sites, domains, tags…'} className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" aria-label="Search the vault" />
          </label>
          <label className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm text-ink-2">
            <SlidersHorizontal className="h-4 w-4 text-ink-3" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent text-sm outline-none" aria-label="Sort">
              <option value="trust" className="bg-obsidian-900">Highest trust</option>
              <option value="new" className="bg-obsidian-900">Newest</option>
              <option value="az" className="bg-obsidian-900">A–Z</option>
            </select>
          </label>
        </div>

        <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`${tab}-${cat}-${sort}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
        {items.length === 0 && (
          <div className="glass mt-8 rounded-3xl px-6 py-16 text-center">
            <p className="font-display text-xl font-bold">Nothing matches.</p>
            <p className="mt-2 text-sm text-ink-3">Try another word, or publish the first one.</p>
            <ButtonLink to="/upload" className="mt-6">
              Publish with proof
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

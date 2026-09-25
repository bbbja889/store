import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Film, Globe, Search, ShieldCheck, Smartphone, Upload, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { searchScore, useCatalog } from '@/data/catalog';
import { useExperience } from '@/state/experience';
import { playSfx } from '@/audio/engine';
import { ListingIcon } from './ListingIcon';
import { VerdictBadge } from './ui';

interface Item {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
  node?: React.ReactNode;
}

export function CommandPalette() {
  const open = useExperience((s) => s.paletteOpen);
  const setOpen = useExperience((s) => s.setPaletteOpen);
  const replay = useExperience((s) => s.replayIntro);
  const toggleSound = useExperience((s) => s.toggleSound);
  const phase = useExperience((s) => s.phase);
  const { apps, sites } = useCatalog();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && phase === 'site') {
        e.preventDefault();
        setOpen(!useExperience.getState().paletteOpen);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [setOpen, phase]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      window.setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  const go = (to: string) => () => {
    setOpen(false);
    navigate(to);
  };

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: 'scan', label: 'X-ray an APK', hint: 'Sentinel Lab', icon: <ShieldCheck className="h-4 w-4 text-ember" />, run: go('/scan') },
      { id: 'link', label: 'Check a suspicious link', hint: 'Link X-ray', icon: <Globe className="h-4 w-4 text-tide" />, run: go('/scan?mode=link') },
      { id: 'verify', label: 'Verify a downloaded APK', hint: 'Hash + certificate match', icon: <ShieldCheck className="h-4 w-4 text-safe" />, run: go('/scan?mode=verify') },
      { id: 'publish', label: 'Publish an app or website', hint: 'The Forge', icon: <Upload className="h-4 w-4 text-ember-light" />, run: go('/upload') },
      { id: 'replay', label: 'Replay the intro film', hint: 'VICZO: The Mask · 26 s', icon: <Film className="h-4 w-4 text-fusion" />, run: () => { setOpen(false); navigate('/'); replay(); } },
      { id: 'sound', label: 'Toggle sound', hint: 'Procedural audio', icon: <Volume2 className="h-4 w-4 text-ink-2" />, run: () => { toggleSound(); setOpen(false); } },
    ];
    const query = q.trim();
    const listings = [...apps, ...sites]
      .map((l) => ({ l, s: searchScore(l, query) }))
      .filter((x) => (query ? x.s > 0 : true))
      .sort((a, b) => b.s - a.s)
      .slice(0, query ? 8 : 5)
      .map(({ l }) => ({
        id: `${l.kind}-${l.slug}`,
        label: l.name,
        hint: l.tagline,
        icon: l.kind === 'app' ? <Smartphone className="h-4 w-4 text-ember" /> : <Globe className="h-4 w-4 text-tide" />,
        node: <ListingIcon listing={l} size={28} />,
        run: go(`/${l.kind === 'app' ? 'app' : 'website'}/${l.slug}`),
        verdict: l.kind === 'app' ? l.passport?.verdict : undefined,
      }));
    const acts = query ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())) : actions;
    return [...acts, ...listings] as Item[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, apps, sites]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
      playSfx('tick');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
      playSfx('tick');
    } else if (e.key === 'Enter') {
      items[sel]?.run();
      playSfx('click');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-label="Search and commands"
            initial={{ y: -16, scale: 0.97, filter: 'blur(10px)' }}
            animate={{ y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ y: -10, scale: 0.98, filter: 'blur(8px)', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong relative w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search className="h-4 w-4 text-ink-3" />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={onKey}
                placeholder="Search apps, sites, or type a command…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
                aria-label="Search"
              />
            </div>
            <ul className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">Nothing matches “{q}”.</li>}
              {items.map((it, i) => (
                <li key={it.id} role="option" aria-selected={i === sel}>
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={it.run}
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', i === sel ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]')}
                  >
                    {it.node ?? <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">{it.icon}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{it.label}</span>
                      <span className="block truncate text-xs text-ink-3">{it.hint}</span>
                    </span>
                    {(it as Item & { verdict?: 'clean' | 'caution' | 'danger' }).verdict && <VerdictBadge verdict={(it as Item & { verdict: 'clean' | 'caution' | 'danger' }).verdict} className="hidden sm:inline-flex" />}
                    <ArrowRight className={cn('h-4 w-4 text-ink-3 transition-opacity', i === sel ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

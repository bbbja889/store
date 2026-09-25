import { useEffect, useMemo, useState } from 'react';
import { useExperience } from '@/state/experience';
import { DEMO_APPS, DEMO_SITES } from './demo';
import type { AppListing, Listing, SiteListing } from './types';

const DEMO_ENABLED = import.meta.env.VITE_DEMO_CATALOG !== 'false';

interface CatalogState {
  apps: AppListing[];
  sites: SiteListing[];
  live: boolean;
  loading: boolean;
  error: string | null;
}

let cache: CatalogState = {
  apps: DEMO_ENABLED ? DEMO_APPS : [],
  sites: DEMO_ENABLED ? DEMO_SITES : [],
  live: false,
  loading: true,
  error: null,
};
const listeners = new Set<(s: CatalogState) => void>();
let started = false;
let waiting = false;

function emit(next: Partial<CatalogState>) {
  cache = { ...cache, ...next };
  listeners.forEach((l) => l(cache));
}

function merge<T extends Listing>(live: T[], demo: T[]): T[] {
  const seen = new Set(live.map((l) => l.slug));
  return [...live, ...(DEMO_ENABLED ? demo.filter((d) => !seen.has(d.slug)) : [])];
}

/** Subscribes once to Firestore (lazy-loaded) and merges live listings over the demo catalog. */
function start() {
  if (started) return;
  // Never compete with the intro film for bandwidth: connect once the site is showing.
  if (useExperience.getState().phase !== 'site') {
    if (waiting) return;
    waiting = true;
    const unsub = useExperience.subscribe((st) => {
      if (st.phase === 'site') {
        unsub();
        start();
      }
    });
    return;
  }
  started = true;
  const timer = window.setTimeout(() => emit({ loading: false }), 6000);
  void (async () => {
    try {
      const [{ db, describeFirebaseError }, fs] = await Promise.all([import('@/firebase'), import('firebase/firestore')]);
      const { collection, onSnapshot, query, orderBy, limit } = fs;
      const sub = <T extends Listing>(name: 'apps' | 'websites', kind: T['kind'], demo: T[], key: 'apps' | 'sites') =>
        onSnapshot(
          query(collection(db, name), orderBy('created_at', 'desc'), limit(200)),
          (snap) => {
            // An offline cache snapshot is not a live catalog; wait for the server.
            if (snap.metadata.fromCache && snap.empty) return;
            const live = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id, kind }) as T);
            window.clearTimeout(timer);
            emit({ [key]: merge(live, demo), live: !snap.metadata.fromCache, loading: false, error: null } as Partial<CatalogState>);
          },
          (err) => {
            window.clearTimeout(timer);
            emit({ loading: false, error: describeFirebaseError(err) });
          },
        );
      sub<AppListing>('apps', 'app', DEMO_APPS, 'apps');
      sub<SiteListing>('websites', 'site', DEMO_SITES, 'sites');
    } catch {
      window.clearTimeout(timer);
      emit({ loading: false, error: 'Live catalog unavailable — showing the demo catalog.' });
    }
  })();
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState(cache);
  useEffect(() => {
    listeners.add(setState);
    start();
    setState(cache);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

export function useListing(kind: 'app' | 'site', slug: string | undefined): { listing: Listing | null; loading: boolean } {
  const cat = useCatalog();
  const listing = useMemo(() => {
    const list: Listing[] = kind === 'app' ? cat.apps : cat.sites;
    return list.find((l) => l.slug === slug) ?? null;
  }, [cat, kind, slug]);
  return { listing, loading: cat.loading && !listing };
}

/** Tiny fuzzy score: substring hits weighted by field, plus subsequence matching on the name. */
export function searchScore(l: Listing, q: string): number {
  const query = q.trim().toLowerCase();
  if (!query) return 1;
  const name = l.name.toLowerCase();
  let score = 0;
  if (name === query) score += 100;
  if (name.startsWith(query)) score += 40;
  if (name.includes(query)) score += 25;
  if (l.tagline.toLowerCase().includes(query)) score += 10;
  if (l.category.toLowerCase().includes(query)) score += 12;
  if (l.tags.some((t) => t.toLowerCase().includes(query))) score += 8;
  if (l.kind === 'app' && l.package_name?.toLowerCase().includes(query)) score += 15;
  if (l.kind === 'site' && l.url.toLowerCase().includes(query)) score += 15;
  let i = 0;
  for (const ch of name) if (ch === query[i]) i++;
  if (i === query.length) score += 5;
  return score;
}

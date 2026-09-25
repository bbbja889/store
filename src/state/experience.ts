import { create } from 'zustand';
import { detectTier, prefersReducedMotion, type Tier } from '@/lib/device';
import { store } from '@/lib/storage';

export type Phase = 'gate' | 'intro' | 'site';
export type IntroKind = 'full' | 'short';

interface ExperienceState {
  phase: Phase;
  introKind: IntroKind;
  sound: boolean;
  tier: Tier;
  renderer: string;
  reducedMotion: boolean;
  /** 0..1 real loading progress shown on the gate. */
  load: number;
  worldReady: boolean;
  paletteOpen: boolean;
  setLoad(v: number): void;
  setWorldReady(): void;
  enter(withSound: boolean): void;
  skipIntro(): void;
  finishIntro(): void;
  replayIntro(): void;
  toggleSound(): void;
  setPaletteOpen(v: boolean): void;
  degrade(): void;
}

const SEEN_KEY = 'viczo:intro-seen';
const SOUND_KEY = 'viczo:sound';

function initial() {
  const reducedMotion = prefersReducedMotion();
  const { tier, renderer } = typeof window === 'undefined' ? { tier: 2 as Tier, renderer: '' } : detectTier();
  const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const seen = store.get(SEEN_KEY) === '1';
  const skip = params.has('nointro') || reducedMotion || tier === 0;
  const phase: Phase = skip ? 'site' : 'gate';
  const introKind: IntroKind = seen && !params.has('intro') ? 'short' : 'full';
  return { reducedMotion, tier, renderer, phase, introKind };
}

export const useExperience = create<ExperienceState>((set, get) => ({
  ...initial(),
  sound: false,
  load: 0,
  worldReady: false,
  paletteOpen: false,
  setLoad: (v) => set({ load: Math.max(get().load, v) }),
  setWorldReady: () => set({ worldReady: true, load: 1 }),
  enter: (withSound) => {
    store.set(SOUND_KEY, withSound ? '1' : '0');
    set({ sound: withSound, phase: 'intro' });
  },
  skipIntro: () => {
    store.set(SEEN_KEY, '1');
    set({ phase: 'site' });
  },
  finishIntro: () => {
    store.set(SEEN_KEY, '1');
    set({ phase: 'site', introKind: 'short' });
  },
  replayIntro: () => {
    if (get().tier === 0) return;
    window.scrollTo({ top: 0 });
    set({ phase: 'intro', introKind: 'full' });
  },
  toggleSound: () => {
    const sound = !get().sound;
    store.set(SOUND_KEY, sound ? '1' : '0');
    set({ sound });
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  degrade: () => {
    const t = get().tier;
    if (t > 1) set({ tier: (t - 1) as Tier });
  },
}));

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useHomePath } from '@/app/useStation';
import { scrollToEl } from '@/app/SmoothScroll';
import { Finale } from '@/components/Finale';
import { ForgeChapter } from '@/sections/ForgeChapter';
import { Hero } from '@/sections/Hero';
import { Noise } from '@/sections/Noise';
import { PassportChapter } from '@/sections/PassportChapter';
import { QuarantineChapter } from '@/sections/QuarantineChapter';
import { SentinelChapter } from '@/sections/SentinelChapter';
import { Vault } from '@/sections/Vault';

/** The home page is the story: each chapter owns a camera station along the scroll path. */
export default function Home() {
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const { hash } = useLocation();
  useHomePath(chapters);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-chapter]');
    chapters.current = Array.from(els);
  }, []);
  useEffect(() => {
    if (hash === '#vault') window.setTimeout(() => scrollToEl(document.getElementById('vault')), 350);
  }, [hash]);

  return (
    <main id="main">
      <div data-chapter="core">
        <Hero />
      </div>
      <div data-chapter="noise">
        <Noise />
      </div>
      <div data-chapter="gate" data-hold="0.85">
        <SentinelChapter />
      </div>
      <div data-chapter="quarantine" data-hold="0.72">
        <QuarantineChapter />
      </div>
      <div data-chapter="passport" data-hold="0.72">
        <PassportChapter />
      </div>
      <div data-chapter="vault" data-hold="0.93">
        <Vault />
      </div>
      <div data-chapter="forge" data-hold="0.7">
        <ForgeChapter />
      </div>
      <div data-chapter="horizon" data-hold="1">
        <Finale />
      </div>
    </main>
  );
}

import { motion } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useCatalog } from '@/data/catalog';
import { useExperience } from '@/state/experience';
import { scrollToEl } from '@/app/SmoothScroll';
import { SplitText } from '@/components/SplitText';
import { Button, ButtonLink, Eyebrow, Magnetic } from '@/components/ui';

export function Hero() {
  const phase = useExperience((s) => s.phase);
  const { apps, sites, live } = useCatalog();
  const play = phase === 'site';
  const scanned = apps.filter((a) => a.passport).length;
  return (
    <section className="relative flex min-h-[100svh] items-end pb-16 pt-28 sm:items-center sm:pb-10" aria-labelledby="hero-title">
      {/* legibility scrim: darkens the storm behind the copy, never the Core */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_60%,rgba(7,6,10,0.82),rgba(7,6,10,0.35)_55%,transparent_75%)] sm:bg-[linear-gradient(90deg,rgba(7,6,10,0.86)_0%,rgba(7,6,10,0.55)_38%,transparent_62%)]" />
      <div className="container-x relative">
        <div className="max-w-[820px]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={play ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
            <Eyebrow>VICZO Store · Sentinel runs on your device</Eyebrow>
          </motion.div>
          <h1 id="hero-title" className="display mt-6 max-w-[15ch] text-[clamp(2.5rem,6vw,5.6rem)]">
            <SplitText play={play} delay={0.35}>
              See inside every app
            </SplitText>{' '}
            <SplitText play={play} delay={0.6} className="block">
              {[<em key="b" className="serif-accent text-gradient pr-2 text-[1.08em] font-normal tracking-normal">before</em>, ' it sees', ' inside you.']}
            </SplitText>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={play ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-[34rem] text-base leading-relaxed text-ink-2 sm:text-lg"
          >
            An app &amp; website store where every APK is X-rayed on your own device — permissions, trackers, signatures — and every link is checked for disguises.{' '}
            <span className="text-ink">Download with proof, not hope.</span>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={play ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic>
              <Button size="lg" onClick={() => scrollToEl(document.getElementById('vault'))} className="w-full sm:w-auto">
                Explore the Vault <ArrowDown className="h-4 w-4" />
              </Button>
            </Magnetic>
            <Magnetic>
              <ButtonLink to="/scan" variant="outline" size="lg" className="w-full sm:w-auto">
                X-ray an APK <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </Magnetic>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0 }}
            animate={play ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 1.6 }}
            className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-5"
          >
            {[
              [String(apps.length), 'apps'],
              [String(sites.length), 'websites'],
              [`${scanned}/${apps.length}`, 'APKs scanned'],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="hud text-ink-3">{l}</dt>
                <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{n}</dd>
              </div>
            ))}
          </motion.dl>
          <motion.p initial={{ opacity: 0 }} animate={play ? { opacity: 1 } : {}} transition={{ delay: 1.9 }} className="hud mt-4 text-[10px] text-ink-3">
            {live ? '● Live catalog' : '○ Demo catalog — connect Firestore to go live'}
          </motion.p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : {}}
        transition={{ delay: 2.3 }}
        className="hud pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink-3 sm:flex"
      >
        <span>Scroll — the story continues</span>
        <span className="h-9 w-px overflow-hidden bg-white/10">
          <span className="block h-1/2 w-px bg-ember" style={{ animation: 'scan-line 1.8s ease-in-out infinite' }} />
        </span>
      </motion.div>
    </section>
  );
}

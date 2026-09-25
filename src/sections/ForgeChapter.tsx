import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ButtonLink, Eyebrow, Magnetic } from '@/components/ui';

const STEPS = [
  ['Drop your APK', 'Sentinel analyses it right in your browser — nothing is uploaded to us.'],
  ['Get your passport', 'Package, version, label and SDKs are filled in for you, with your trust score.'],
  ['Link your download', 'Point to your own https release (GitHub, your site). We store the fingerprint.'],
  ['Go live with proof', 'Your signing certificate becomes your identity. Repackaged copies show up as mismatches.'],
];

export function ForgeChapter() {
  return (
    <section className="relative flex min-h-[110svh] items-center py-28" aria-labelledby="forge-title" data-hold="0.7">
      <div className="container-x">
        <div className="max-w-2xl">
          <Eyebrow tone="ember">Chapter 06 — The Forge</Eyebrow>
          <h2 id="forge-title" className="display mt-5 text-[clamp(2rem,4.8vw,4.1rem)]">
            Publish <span className="serif-accent font-normal tracking-normal text-ember-light">with proof.</span>
          </h2>
          <p className="mt-4 text-ink-2">Built something? Ship it with a passport your users can check themselves.</p>
        </div>
        <ol className="mt-14 grid max-w-3xl gap-4 sm:grid-cols-2">
          {STEPS.map(([t, b], i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="glass relative overflow-hidden rounded-3xl p-6"
            >
              <span className="font-display text-5xl font-black text-white/[0.06]">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-ink-2">{b}</p>
              <span className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-ember/0 via-ember/70 to-ember/0" />
            </motion.li>
          ))}
        </ol>
        <Magnetic className="mt-10">
          <ButtonLink to="/upload" size="lg">
            Enter the Forge <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </Magnetic>
      </div>
    </section>
  );
}

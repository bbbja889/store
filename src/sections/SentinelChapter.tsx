import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, Lock } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ButtonLink, Eyebrow } from '@/components/ui';

const STEPS = [
  {
    k: '01',
    title: 'Unpack',
    body: 'An APK is a ZIP. Sentinel reads its central directory and every entry — code, resources, native libraries, signatures — and hashes the whole file with SHA-256.',
    log: ['open  kyc-update.apk  3.4 KB', 'zip   9 entries · central directory @ 0x0b41', 'hash  sha256 9f2c…a41e'],
  },
  {
    k: '02',
    title: 'Read the manifest',
    body: 'AndroidManifest.xml is compiled binary XML. Sentinel decodes it to list every permission, component, SDK level and flag — even when obfuscators strip attribute names.',
    log: ['axml  string pool 212 · resource map 38', 'perm  READ_SMS · RECEIVE_SMS · SYSTEM_ALERT_WINDOW', 'svc   BIND_ACCESSIBILITY_SERVICE  ⚠'],
  },
  {
    k: '03',
    title: 'Trace the code',
    body: 'Every classes.dex is scanned for the libraries and APIs it references: tracker SDKs, runtime code loading, SMS sending, device-admin calls, packers.',
    log: ['dex   classes.dex · 5 types · 2 method refs', 'sdk   AppsFlyer (attribution) · Facebook Audience Network (ads)', 'api   DexClassLoader  →  dropper signal'],
  },
  {
    k: '04',
    title: 'Check the seal',
    body: 'Sentinel finds the APK Signing Block, verifies the signature with your browser’s own cryptography and recomputes the content digest. One changed byte and the seal breaks.',
    log: ['sig   APK Signature Scheme v2 · RSA-2048/SHA-256', 'x509  CN=Android Debug, O=Android  ⚠ debug key', 'verify ✓ signature   ✓ content digest'],
  },
  {
    k: '05',
    title: 'Score',
    body: 'Findings become a 0–100 Trust score with a grade and a verdict, and every point deducted comes with a plain-language reason. No black box.',
    log: ['combo banking-trojan toolkit        −35', 'combo personal-data harvester       −22', 'score 0 / 100 · grade F · HIGH RISK'],
  },
];

export function SentinelChapter() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length * 1.02)))));
  const s = STEPS[step];

  return (
    <section ref={ref} className="relative" style={{ height: '330svh' }} aria-labelledby="sentinel-title" data-hold="0.82">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="container-x grid w-full gap-10 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div>
            <Eyebrow tone="tide">Chapter 02 — The Sentinel</Eyebrow>
            <h2 id="sentinel-title" className="display mt-5 text-[clamp(2rem,4.6vw,3.9rem)]">
              Nothing enters <span className="serif-accent font-normal tracking-normal text-tide">unscanned.</span>
            </h2>
            <ol className="mt-8 space-y-1">
              {STEPS.map((x, i) => (
                <li key={x.k}>
                  <div className={cn('flex items-baseline gap-4 rounded-2xl px-4 py-2.5 transition-colors duration-500', i === step ? 'bg-white/[0.06]' : 'opacity-45')}>
                    <span className={cn('font-mono text-xs', i === step ? 'text-tide' : 'text-ink-3')}>{x.k}</span>
                    <span className="font-display text-lg font-bold tracking-tight">{x.title}</span>
                    <span className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-tide transition-all duration-700" style={{ width: i < step ? '100%' : i === step ? '60%' : '0%' }} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="relative mt-6 min-h-[210px]">
              <AnimatePresence mode="wait">
                <motion.div key={s.k} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.45 }}>
                  <p className="text-ink-2">{s.body}</p>
                  <div className="glass-strong mt-4 rounded-2xl p-4 font-mono text-[11px] leading-6 text-ink-2 sm:text-xs">
                    {s.log.map((line, i) => (
                      <motion.p key={line} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.18 }}>
                        <span className="mr-2 text-ember">›</span>
                        {line}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <ButtonLink to="/scan" variant="tide">
                X-ray an APK <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <p className="flex items-center gap-2 text-xs text-ink-3">
                <Lock className="h-3.5 w-3.5 text-safe" /> Runs in a sandboxed worker in your browser. Your file never leaves your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

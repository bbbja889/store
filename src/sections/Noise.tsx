import { motion } from 'motion/react';
import { Bug, Eye, Landmark, Link2, PackageOpen, Wallet } from 'lucide-react';
import { SplitText } from '@/components/SplitText';
import { Eyebrow } from '@/components/ui';

const THREATS = [
  {
    icon: Landmark,
    title: 'Banking trojans',
    body: 'Draw a fake login screen over your real bank app, then read the OTP that arrives by SMS.',
    check: 'Accessibility service + draw-over-apps + SMS access, together',
  },
  {
    icon: Wallet,
    title: 'Loan-app harvesters',
    body: 'Copy your contacts, call history and photos — then use them to pressure and shame you.',
    check: 'Contacts + messages/call log + photos pattern',
  },
  {
    icon: Eye,
    title: 'Stalkerware',
    body: 'Hides its own icon and quietly records your microphone and location.',
    check: 'Mic + precise location with no launcher icon',
  },
  {
    icon: PackageOpen,
    title: 'Droppers',
    body: 'Pass every check at install time, then download the real payload later.',
    check: 'Runtime code loading + permission to install APKs',
  },
  {
    icon: Bug,
    title: 'Repackaged “mods”',
    body: 'A popular app, modified, with extra code inside — re-signed with someone else’s key.',
    check: 'Cryptographic signature check + certificate fingerprint',
  },
  {
    icon: Link2,
    title: 'Look-alike links',
    body: '“раypal.com” is not paypal.com — that first letter is Cyrillic. KYC and refund scams live here.',
    check: 'Punycode decoding, homographs, typo-squats, fake subdomains',
  },
];

export function Noise() {
  return (
    <section className="relative flex min-h-[150svh] items-center py-32" aria-labelledby="noise-title">
      <div className="container-x">
        <div className="max-w-3xl">
          <Eyebrow tone="ink">Chapter 01 — The Noise</Eyebrow>
          <h2 id="noise-title" className="display mt-6 text-[clamp(2.2rem,5.6vw,4.8rem)]">
            <SplitText>The internet doesn’t check.</SplitText>{' '}
            <SplitText delay={0.25} className="block">
              {[<em key="a" className="serif-accent font-normal tracking-normal text-danger">Attackers know it.</em>]}
            </SplitText>
          </h2>
          <motion.p initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} className="mt-6 max-w-xl text-lg text-ink-2">
            Apps from outside official stores and links forwarded by SMS or WhatsApp are where most phone scams begin. They look exactly like the real thing — that’s the whole point.
          </motion.p>
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THREATS.map((t, i) => (
            <motion.li
              key={t.title}
              initial={{ opacity: 0, y: 40, rotateX: -18 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: '-6% 0px' }}
              transition={{ duration: 1, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass group relative overflow-hidden rounded-3xl p-6"
              style={{ transformPerspective: 900 }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'radial-gradient(120% 80% at 0% 0%, rgba(255,61,90,0.14), transparent 60%)' }} />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-bold tracking-tight">{t.title}</h3>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-ink-2">{t.body}</p>
              <p className="relative mt-5 border-t border-white/10 pt-4 text-xs text-ink-3">
                <span className="hud mr-2 text-tide">Sentinel checks</span>
                {t.check}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

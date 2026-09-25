import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useStation } from '@/app/useStation';
import { world } from '@/state/world';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  useStation('lost');
  useEffect(() => {
    world.glitch = 1;
    return () => {
      world.glitch = 0;
    };
  }, []);
  return (
    <main id="main" className="relative flex min-h-[100svh] items-center">
      <div className="container-x">
        <p className="hud text-danger">Signal lost · 404</p>
        <h1 className="display relative mt-6 text-[clamp(4rem,18vw,14rem)]">
          <span className="relative inline-block">
            404
            <span aria-hidden className="absolute inset-0 text-tide opacity-70 mix-blend-screen" style={{ animation: 'glitch-shift 1.6s steps(2) infinite' }}>
              404
            </span>
            <span aria-hidden className="absolute inset-0 text-danger opacity-70 mix-blend-screen" style={{ animation: 'glitch-shift 1.3s steps(2) infinite reverse' }}>
              404
            </span>
          </span>
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 max-w-md text-lg text-ink-2">
          This route doesn’t exist — or it’s wearing a mask.
        </motion.p>
        <ButtonLink to="/" className="mt-8">
          Back to the Core
        </ButtonLink>
      </div>
    </main>
  );
}

import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Grade, Verdict } from '@/sentinel/types';
import { VERDICT_STYLE } from './ui';

/** Animated trust score ring: the arc and the number count up when it scrolls into view. */
export function TrustRing({ score, grade, verdict, size = 120, stroke = 8, label = true }: { score: number; grade: Grade; verdict: Verdict; size?: number; stroke?: number; label?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const v = useMotionValue(0);
  const [shown, setShown] = useState(0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = useTransform(v, (x) => `${(x / 100) * c} ${c}`);
  const color = VERDICT_STYLE[verdict].hex;

  useEffect(() => {
    if (!inView) return;
    const ctl = animate(v, score, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setShown(Math.round(x)) });
    return () => ctl.stop();
  }, [inView, score, v]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,239,233,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,239,233,0.05)" strokeWidth={stroke} strokeDasharray="2 6" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ strokeDasharray: dash, filter: `drop-shadow(0 0 ${stroke}px ${color}88)` }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-extrabold tabular-nums leading-none text-ink" style={{ fontSize: size * 0.3 }}>
            {shown}
          </span>
          <span className="hud mt-1" style={{ color, fontSize: Math.max(9, size * 0.085) }}>
            Grade {grade}
          </span>
        </div>
      )}
      <span className="sr-only">
        Trust score {score} out of 100, grade {grade}, {VERDICT_STYLE[verdict].label}
      </span>
    </div>
  );
}

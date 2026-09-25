import { motion, useMotionValue, useSpring } from 'motion/react';
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { playSfx } from '@/audio/engine';
import type { Severity, Verdict } from '@/sentinel/types';

type Variant = 'primary' | 'ghost' | 'outline' | 'tide';

const variants: Record<Variant, string> = {
  primary:
    'bg-ember text-void hover:bg-ember-light shadow-[0_0_0_1px_rgba(255,107,44,0.4),0_10px_40px_-10px_rgba(255,107,44,0.7)]',
  tide: 'bg-tide text-void hover:bg-tide-light shadow-[0_0_0_1px_rgba(41,211,255,0.4),0_10px_40px_-10px_rgba(41,211,255,0.6)]',
  outline: 'border border-white/15 text-ink hover:border-white/40 hover:bg-white/5',
  ghost: 'text-ink-2 hover:text-ink hover:bg-white/5',
};

const base =
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-medium transition-[background,color,border,box-shadow,transform] duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 select-none';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', onClick, onMouseEnter, ...p }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], size === 'sm' && 'px-3.5 py-2 text-xs', size === 'lg' && 'px-7 py-4 text-base', className)}
      onMouseEnter={(e) => {
        playSfx('tick');
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        playSfx('click');
        onClick?.(e);
      }}
      {...p}
    />
  ),
);
Button.displayName = 'Button';

export function ButtonLink({ className, variant = 'primary', size = 'md', ...p }: LinkProps & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Link
      className={cn(base, variants[variant], size === 'sm' && 'px-3.5 py-2 text-xs', size === 'lg' && 'px-7 py-4 text-base', className)}
      onMouseEnter={() => playSfx('tick')}
      onClick={() => playSfx('click')}
      {...p}
    />
  );
}

/** Pulls its child toward the cursor a little — tactile, "physical" UI. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });
  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className, tone = 'ember' }: { children: ReactNode; className?: string; tone?: 'ember' | 'tide' | 'fusion' | 'ink' }) {
  const dot = { ember: 'bg-ember', tide: 'bg-tide', fusion: 'bg-fusion', ink: 'bg-ink-2' }[tone];
  return (
    <p className={cn('hud inline-flex items-center gap-2 text-ink-2', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} style={{ animation: 'pulse-dot 2.4s ease-in-out infinite' }} />
      {children}
    </p>
  );
}

export function Chip({ active, children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300',
        active ? 'border-ember/60 bg-ember/15 text-ink' : 'border-white/10 text-ink-2 hover:border-white/30 hover:text-ink',
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
}

export const VERDICT_STYLE: Record<Verdict, { label: string; text: string; bg: string; border: string; hex: string }> = {
  clean: { label: 'Clean signal', text: 'text-safe', bg: 'bg-safe/10', border: 'border-safe/40', hex: '#3cf2a0' },
  caution: { label: 'Caution', text: 'text-caution', bg: 'bg-caution/10', border: 'border-caution/40', hex: '#ffc24a' },
  danger: { label: 'High risk', text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/45', hex: '#ff3d5a' },
};

export const SEVERITY_STYLE: Record<Severity, { dot: string; text: string; label: string }> = {
  critical: { dot: 'bg-danger shadow-[0_0_12px_#ff3d5a]', text: 'text-danger', label: 'Critical' },
  high: { dot: 'bg-danger', text: 'text-danger', label: 'High' },
  medium: { dot: 'bg-caution', text: 'text-caution', label: 'Medium' },
  low: { dot: 'bg-ink-3', text: 'text-ink-2', label: 'Low' },
  info: { dot: 'bg-tide', text: 'text-tide', label: 'Info' },
  good: { dot: 'bg-safe', text: 'text-safe', label: 'Good' },
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <span className={cn('hud inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1', v.text, v.bg, v.border, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.hex }} />
      {v.label}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">{children}</kbd>;
}

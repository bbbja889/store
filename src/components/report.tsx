import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Composition, Finding } from '@/sentinel/types';
import { lookupPermission, shortPermission } from '@/sentinel/knowledge/permissions';
import { bytes } from '@/lib/format';
import { cn } from '@/lib/cn';
import { LAYERS } from '@/world/sets/Lab';
import { SEVERITY_STYLE } from './ui';

export function Panel({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn('glass-strong rounded-3xl p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="hud text-ink-2">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function FindingList({ findings, limit }: { findings: (Pick<Finding, 'id' | 'severity' | 'title' | 'detail'> & { penalty?: number })[]; limit?: number }) {
  const list = limit ? findings.slice(0, limit) : findings;
  return (
    <ul className="space-y-3">
      {list.map((f, i) => (
        <motion.li key={f.id + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_STYLE[f.severity].dot)} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">
              {f.title}
              {!!f.penalty && <span className="ml-2 font-mono text-xs text-ink-3">−{f.penalty}</span>}
            </p>
            {f.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{f.detail}</p>}
          </div>
          <span className={cn('hud shrink-0 text-[10px]', SEVERITY_STYLE[f.severity].text)}>{SEVERITY_STYLE[f.severity].label}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export function CompositionBar({ composition }: { composition: Composition }) {
  const total = Object.values(composition).reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
        {LAYERS.map((l) => {
          const w = (composition[l.key] / total) * 100;
          return w > 0 ? <motion.div key={l.key} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ background: l.color }} title={`${l.label} ${bytes(composition[l.key])}`} /> : null;
        })}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        {LAYERS.filter((l) => composition[l.key] > 0).map((l) => (
          <li key={l.key} className="flex items-center gap-2 text-ink-2">
            <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
            {l.label} <span className="ml-auto font-mono text-ink-3">{bytes(composition[l.key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PermissionList({ names }: { names: string[] }) {
  const rows = names
    .map((n) => ({ n, info: lookupPermission(n) }))
    .sort((a, b) => (b.info?.weight ?? -1) - (a.info?.weight ?? -1));
  if (!rows.length) return <p className="text-sm text-ink-3">No permissions requested.</p>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {rows.map(({ n, info }) => {
        const sev = !info ? 'low' : info.weight >= 7 ? 'high' : info.weight >= 4 ? 'medium' : info.weight >= 1 ? 'low' : 'good';
        return (
          <li key={n} className="flex items-start gap-3 py-2.5">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_STYLE[sev].dot)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{info?.label ?? shortPermission(n)}</p>
              <p className="text-xs text-ink-3">{info?.plain ?? 'Custom or uncommon permission.'}</p>
            </div>
            <code className="hidden shrink-0 font-mono text-[10px] text-ink-3 sm:block">{shortPermission(n)}</code>
          </li>
        );
      })}
    </ul>
  );
}

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] py-2 text-sm last:border-0">
      <dt className="shrink-0 text-ink-3">{k}</dt>
      <dd className={cn('min-w-0 break-all text-right text-ink-2', mono && 'font-mono text-xs')}>{v}</dd>
    </div>
  );
}

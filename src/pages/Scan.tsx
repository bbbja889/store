import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Fingerprint, Globe, Link2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStation } from '@/app/useStation';
import { useCatalog } from '@/data/catalog';
import type { AppListing } from '@/data/types';
import { world } from '@/state/world';
import { playSfx } from '@/audio/engine';
import { iconUrl, reportToJson, scanApk } from '@/sentinel/client';
import { VERDICT_COPY } from '@/sentinel/score';
import type { ApkReport, Stage } from '@/sentinel/types';
import { inspectLink, type LinkReport } from '@/sentinel/url/inspect';
import { androidName, bytes, colonHex, date } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CompositionBar, FindingList, KV, Panel, PermissionList } from '@/components/report';
import { TrustRing } from '@/components/TrustRing';
import { Button, Eyebrow, VerdictBadge, VERDICT_STYLE } from '@/components/ui';

type Mode = 'apk' | 'link' | 'verify';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'read', label: 'Hashing file' },
  { id: 'unzip', label: 'Unpacking' },
  { id: 'manifest', label: 'Reading manifest' },
  { id: 'code', label: 'Tracing code' },
  { id: 'signature', label: 'Checking the seal' },
  { id: 'score', label: 'Scoring' },
];

function resetScan() {
  Object.assign(world.scan, { active: false, stage: 'idle', progress: 0, verdict: null, composition: null, explode: 0, score: 0 });
}

/* ───────────────────────── APK drop + scan */
function useApkScan() {
  const [report, setReport] = useState<ApkReport | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [detail, setDetail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const run = useCallback(async (file: Blob, fileName: string) => {
    setReport(null);
    setError(null);
    setName(fileName);
    resetScan();
    world.scan.active = true;
    playSfx('scan');
    const started = performance.now();
    try {
      const r = await scanApk(file, fileName, (s, d) => {
        setStage(s);
        setDetail(d ?? '');
        world.scan.stage = s;
        world.scan.progress = (STAGES.findIndex((x) => x.id === s) + 1) / STAGES.length;
      });
      // Let the chamber sweep for a beat even on tiny files: the drama is part of the explanation.
      const wait = Math.max(0, 1600 - (performance.now() - started));
      await new Promise((res) => setTimeout(res, wait));
      world.scan.composition = r.composition;
      world.scan.explode = 1;
      await new Promise((res) => setTimeout(res, 500));
      world.scan.verdict = r.verdict;
      world.scan.score = r.score;
      playSfx(r.verdict === 'danger' ? 'alarm' : r.verdict === 'clean' ? 'good' : 'hit');
      setStage('done');
      setReport(r);
    } catch (e) {
      setError((e as Error).message);
      setStage(null);
      world.scan.active = false;
      playSfx('alarm', { gain: 0.5 });
    }
  }, []);
  return { report, stage, detail, error, name, run };
}

function DropZone({ onFile, label, hint }: { onFile: (f: File) => void; label: string; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    // The whole page is a drop target.
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      setOver(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setOver(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onFile(f);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [onFile]);
  return (
    <>
      <button
        onClick={() => input.current?.click()}
        className={cn('group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed px-6 py-10 text-center transition-colors', over ? 'border-tide bg-tide/10' : 'border-white/15 bg-void/40 hover:border-white/35')}
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tide to-transparent opacity-60" style={{ animation: 'scan-line 3s linear infinite' }} />
        <FileUp className="h-7 w-7 text-tide" />
        <span className="font-display text-lg font-bold">{label}</span>
        <span className="max-w-sm text-xs text-ink-3">{hint}</span>
      </button>
      <input ref={input} type="file" accept=".apk,application/vnd.android.package-archive" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <AnimatePresence>
        {over && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-3 z-[60] flex items-center justify-center rounded-[32px] border-2 border-dashed border-tide/70 bg-void/60 backdrop-blur-sm">
            <p className="display text-4xl text-tide sm:text-6xl">Release to X-ray</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StageTrack({ stage, detail }: { stage: Stage | null; detail: string }) {
  const idx = stage === 'done' ? STAGES.length : STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="space-y-2" aria-live="polite">
      {STAGES.map((s, i) => (
        <li key={s.id} className={cn('flex items-center gap-3 text-sm transition-opacity', i > idx && 'opacity-35')}>
          <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', i < idx ? 'border-safe/50 text-safe' : i === idx ? 'border-tide text-tide' : 'border-white/15 text-ink-3')}>
            {i < idx ? '✓' : i + 1}
          </span>
          <span className={i === idx ? 'text-ink' : 'text-ink-2'}>{s.label}</span>
          {i === idx && <span className="ml-auto truncate font-mono text-[11px] text-ink-3">{detail}</span>}
        </li>
      ))}
    </ol>
  );
}

export function ApkReportView({ report }: { report: ApkReport }) {
  const icon = useMemo(() => iconUrl(report), [report]);
  useEffect(() => () => void (icon && URL.revokeObjectURL(icon)), [icon]);
  const v = VERDICT_STYLE[report.verdict];
  const c = report.signing.cert;
  const download = () => {
    const blob = new Blob([reportToJson(report)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${report.identity.packageName}-sentinel.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
      <section className={cn('glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8', v.border)} style={{ boxShadow: `0 40px 120px -50px ${v.hex}` }}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <TrustRing score={report.score} grade={report.grade} verdict={report.verdict} size={132} stroke={9} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {icon ? <img src={icon} alt="" className="h-11 w-11 rounded-xl ring-1 ring-white/10" /> : null}
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-bold">{report.identity.label}</p>
                <p className="truncate font-mono text-xs text-ink-3">{report.identity.packageName}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={report.verdict} />
              <span className="text-sm text-ink-2">{VERDICT_COPY[report.verdict].line}</span>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Analysed on this device in {report.durationMs} ms · {bytes(report.file.size)} · {report.file.entries} entries · nothing uploaded
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" /> JSON
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Why this score">
          <FindingList findings={report.findings} />
        </Panel>
        <div className="space-y-4">
          <Panel title="Identity">
            <dl>
              <KV k="Version" v={`${report.identity.versionName ?? '—'} (${report.identity.versionCode ?? '—'})`} />
              <KV k="Runs on" v={androidName(report.identity.minSdk) + ' +'} />
              <KV k="Targets" v={androidName(report.identity.targetSdk)} />
              <KV k="SHA-256" v={report.file.sha256} mono />
            </dl>
          </Panel>
          <Panel title="The seal" aside={<span className={cn('hud text-[10px]', report.signing.verified ? 'text-safe' : report.signing.verified === false ? 'text-danger' : 'text-ink-3')}>{report.signing.verified ? 'Verified' : report.signing.verified === false ? 'Broken' : 'Unchecked'}</span>}>
            <dl>
              <KV k="Schemes" v={report.signing.schemes.join(' · ') || 'unsigned'} />
              {c && <KV k="Signer" v={c.subject || '—'} />}
              {c && <KV k="Key" v={`${c.keyAlgorithm}${c.keyBits ? `-${c.keyBits}` : ''} · ${c.signatureAlgorithm}`} />}
              {c && <KV k="Valid" v={`${date(c.notBefore)} → ${date(c.notAfter)}`} />}
              {c && <KV k="Cert SHA-256" v={colonHex(c.sha256)} mono />}
            </dl>
          </Panel>
        </div>
      </div>

      <Panel title="What's inside">
        <CompositionBar composition={report.composition} />
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
          {[
            ['Classes', report.code.classes.toLocaleString()],
            ['DEX files', report.code.dexFiles],
            ['Native ABIs', report.native.abis.join(', ') || 'none'],
            ['Open entry points', report.components.exportedUnprotected.length],
          ].map(([k, val]) => (
            <div key={String(k)} className="rounded-2xl bg-white/[0.03] p-3">
              <p className="hud text-[10px] text-ink-3">{k}</p>
              <p className="mt-1 font-mono text-ink">{val}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Permissions · ${report.permissions.length}`}>
          <PermissionList names={report.permissions.map((p) => p.name)} />
        </Panel>
        <div className="space-y-4">
          <Panel title={`Trackers · ${report.code.trackers.length}`}>
            {report.code.trackers.length ? (
              <ul className="space-y-2">
                {report.code.trackers.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{t.name}</span>
                    <span className="hud text-[10px] text-caution">{t.kind}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-safe">No known tracker SDKs found.</p>
            )}
          </Panel>
          <Panel title="Code signals">
            {report.code.signals.length ? (
              <ul className="space-y-1.5 text-sm text-ink-2">
                {report.code.signals.map((s) => (
                  <li key={s.id}>› {s.title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nothing unusual referenced.</p>
            )}
            {report.native.packers.length > 0 && <p className="mt-3 text-sm text-danger">Packer: {report.native.packers.join(', ')}</p>}
          </Panel>
        </div>
      </div>
      <p className="text-center text-xs text-ink-3">Sentinel is static, pre-install analysis — not an antivirus. It shows signals and explains them; it cannot see what a server sends the app later.</p>
    </motion.div>
  );
}

/* ───────────────────────── Link X-ray */
export function LinkReportView({ report }: { report: LinkReport }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="glass-strong rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <TrustRing score={report.score} grade={report.grade} verdict={report.verdict} size={120} />
          <div className="min-w-0 flex-1">
            <p className="hud text-ink-3">What your browser really opens</p>
            <p className="mt-2 break-all font-mono text-2xl sm:text-3xl" aria-label={report.unicodeHost}>
              {report.hostChars.length ? (
                report.hostChars.map((c, i) => (
                  <span key={i} className={cn(c.imitates && 'rounded bg-danger/25 px-0.5 text-danger underline decoration-wavy', c.script === 'other' && 'text-caution')} title={c.imitates ? `${c.script} “${c.ch}” imitating Latin “${c.imitates}”` : undefined}>
                    {c.ch}
                  </span>
                ))
              ) : (
                <span className="text-ink-3">—</span>
              )}
            </p>
            {report.host !== report.unicodeHost && <p className="mt-1 font-mono text-xs text-ink-3">encoded as {report.host}</p>}
            <p className="mt-2 text-xs text-ink-3">
              Registered domain: <span className="text-ink-2">{report.registrable || '—'}</span>
              {report.brand && (
                <>
                  {' '}
                  · {report.brand.official ? 'official' : 'claims to be'} <span className="text-ink-2">{report.brand.name}</span>
                </>
              )}
            </p>
            <div className="mt-3">
              <VerdictBadge verdict={report.verdict} />
            </div>
          </div>
        </div>
      </section>
      <Panel title="Findings">
        <FindingList findings={report.findings} />
      </Panel>
    </motion.div>
  );
}

const LINK_SAMPLES = [
  ['Homograph', 'https://xn--80ak6aa92e.com/login'],
  ['KYC scam', 'http://sbi-kyc-update.in/verify.apk'],
  ['Fake subdomain', 'http://paypal.com.account-verify.secure-login.top/signin'],
  ['Hidden @', 'https://google.com@198.51.100.7/login'],
  ['Legit', 'https://www.paypal.com/signin'],
];

function LinkMode() {
  const [params] = useSearchParams();
  const [url, setUrl] = useState(params.get('url') ?? '');
  const report = useMemo(() => (url.trim() ? inspectLink(url) : null), [url]);
  useEffect(() => {
    world.scan.active = !!report;
    world.scan.verdict = report?.verdict ?? null;
    world.scan.composition = null;
    world.scan.explode = 0;
  }, [report]);
  return (
    <div className="space-y-4">
      <div className="glass-strong flex items-center gap-3 rounded-full px-5 py-3">
        <Link2 className="h-4 w-4 shrink-0 text-tide" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link from an SMS, email or WhatsApp…" className="w-full bg-transparent font-mono text-sm outline-none placeholder:font-sans placeholder:text-ink-3" aria-label="Link to inspect" autoFocus />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="hud self-center text-[10px] text-ink-3">Try</span>
        {LINK_SAMPLES.map(([l, u]) => (
          <button key={l} onClick={() => setUrl(u)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-ink-2 hover:border-white/30 hover:text-ink">
            {l}
          </button>
        ))}
      </div>
      {report && <LinkReportView report={report} />}
      <p className="flex items-center gap-2 text-xs text-ink-3">
        <Lock className="h-3.5 w-3.5 text-safe" /> Checked entirely offline. The link is never visited or sent anywhere.
      </p>
    </div>
  );
}

/* ───────────────────────── Verify a download against a passport */
function VerifyMode() {
  const { apps } = useCatalog();
  const [params] = useSearchParams();
  const withPassport = apps.filter((a) => a.passport);
  const [slug, setSlug] = useState(params.get('slug') ?? withPassport[0]?.slug ?? '');
  const listing = withPassport.find((a) => a.slug === slug) as AppListing | undefined;
  const scan = useApkScan();
  const p = listing?.passport;
  const r = scan.report;
  const hashOk = r && p ? r.file.sha256 === p.sha256 : null;
  const certOk = r && p ? !!r.signing.cert && r.signing.cert.sha256 === p.signature.cert_sha256 : null;
  const onFile = useCallback((f: File) => void scan.run(f, f.name), [scan]);
  return (
    <div className="space-y-4">
      <label className="glass-strong flex items-center gap-3 rounded-full px-5 py-3 text-sm">
        <span className="text-ink-3">Listing</span>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-transparent outline-none">
          {withPassport.map((a) => (
            <option key={a.slug} value={a.slug} className="bg-obsidian-900">
              {a.name} — {a.passport!.package_name}
            </option>
          ))}
        </select>
      </label>
      <DropZone onFile={onFile} label="Drop the APK you downloaded" hint="We recompute its SHA-256 and signing certificate and compare them with the listing's passport." />
      {scan.stage && scan.stage !== 'done' && <StageTrack stage={scan.stage} detail={scan.detail} />}
      {scan.error && <p className="text-sm text-danger">{scan.error}</p>}
      {r && p && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong space-y-4 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            {hashOk ? <CheckCircle2 className="h-8 w-8 text-safe" /> : certOk ? <AlertTriangle className="h-8 w-8 text-caution" /> : <XCircle className="h-8 w-8 text-danger" />}
            <p className="font-display text-2xl font-bold">
              {hashOk ? 'Identical to the scanned build.' : certOk ? 'Same developer, different build.' : 'This is not the file on the passport.'}
            </p>
          </div>
          <dl>
            <KV k="File SHA-256" v={<span className={hashOk ? 'text-safe' : 'text-danger'}>{hashOk ? 'match ✓' : 'different ✗'}</span>} />
            <KV k="Signing certificate" v={<span className={certOk ? 'text-safe' : 'text-danger'}>{certOk ? 'match ✓' : 'different ✗ — possibly repackaged'}</span>} />
            <KV k="Package" v={`${r.identity.packageName} ${r.identity.packageName === p.package_name ? '✓' : '✗'}`} />
          </dl>
          <p className="text-xs text-ink-3">
            {hashOk ? 'Every byte matches what Sentinel scanned for this listing.' : certOk ? 'Signed by the same key, so it comes from the same developer — probably a newer or older version.' : 'Different signer: treat this file as untrusted, even if it looks like the same app.'}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ───────────────────────── Page */
export default function Scan() {
  useStation('lab', () => resetScan);
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) || 'apk';
  const scan = useApkScan();
  const onFile = useCallback((f: File) => void scan.run(f, f.name), [scan]);
  const sample = async (path: string, name: string) => {
    const res = await fetch(path);
    await scan.run(await res.blob(), name);
  };
  useEffect(() => {
    resetScan();
  }, [mode]);

  const tabs: [Mode, string, typeof ShieldCheck][] = [
    ['apk', 'APK X-ray', ShieldCheck],
    ['link', 'Link X-ray', Globe],
    ['verify', 'Verify a download', Fingerprint],
  ];

  return (
    <main id="main" className="relative min-h-[100svh] pb-24 pt-28">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,640px)_1fr]">
        <div>
          <Eyebrow tone="tide">Sentinel Lab · on-device</Eyebrow>
          <h1 className="display mt-5 text-[clamp(2.2rem,5vw,4.2rem)]">
            X-ray it <span className="serif-accent font-normal tracking-normal text-tide">before you trust it.</span>
          </h1>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist">
            {tabs.map(([m, label, Icon]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setParams({ mode: m })}
                className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition', mode === m ? 'border-tide/60 bg-tide/15 text-ink' : 'border-white/10 text-ink-2 hover:border-white/30')}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {mode === 'apk' && (
              <div className="space-y-4">
                <DropZone onFile={onFile} label="Drop an APK anywhere" hint="Or click to choose. Analysed in a sandboxed worker in your browser — the file never leaves your device." />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hud text-[10px] text-ink-3">No APK handy?</span>
                  <button onClick={() => void sample('/samples/orbit-notes-demo.apk', 'orbit-notes-demo.apk')} className="rounded-full border border-safe/30 px-3 py-1.5 text-xs text-safe hover:bg-safe/10">
                    Clean sample
                  </button>
                  <button onClick={() => void sample('/samples/kyc-update-risky-sample.apk', 'kyc-update-risky-sample.apk')} className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10">
                    Risky sample
                  </button>
                  <span className="text-[11px] text-ink-3">Synthetic, inert samples — no executable code.</span>
                </div>
                {scan.stage && scan.stage !== 'done' && (
                  <div className="glass-strong rounded-3xl p-5">
                    <p className="mb-3 truncate font-mono text-xs text-ink-3">{scan.name}</p>
                    <StageTrack stage={scan.stage} detail={scan.detail} />
                  </div>
                )}
                {scan.error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{scan.error}</p>}
              </div>
            )}
            {mode === 'link' && <LinkMode />}
            {mode === 'verify' && <VerifyMode />}
          </div>
        </div>
      </div>
      {mode === 'apk' && scan.report && (
        <div className="container-x mt-10">
          <ApkReportView report={scan.report} />
        </div>
      )}
    </main>
  );
}

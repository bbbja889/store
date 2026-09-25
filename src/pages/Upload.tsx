import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Globe, Smartphone } from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { signIn, useAuth } from '@/app/useAuth';
import { useStation } from '@/app/useStation';
import { toLinkPassport, toPassport } from '@/data/passport';
import { APP_CATEGORIES, SITE_CATEGORIES } from '@/data/types';
import { scanApk } from '@/sentinel/client';
import type { ApkReport, Stage } from '@/sentinel/types';
import { inspectLink } from '@/sentinel/url/inspect';
import { slugify } from '@/lib/format';
import { cn } from '@/lib/cn';
import { TrustRing } from '@/components/TrustRing';
import { Button, Eyebrow, VerdictBadge } from '@/components/ui';

const field = 'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition focus:border-ember/60 focus:bg-white/[0.05] placeholder:text-ink-3';

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between">
      <span className="hud text-[10px] text-ink-2">{children}</span>
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </span>
  );
}

export default function Upload() {
  useStation('forge');
  const { user, ready } = useAuth();
  const [kind, setKind] = useState<'app' | 'site' | null>(null);
  const [report, setReport] = useState<ApkReport | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', tagline: '', description: '', category: '', url: '', download_url: '', tags: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const link = useMemo(() => (kind === 'site' && form.url.trim() ? inspectLink(form.url) : null), [kind, form.url]);

  const onFile = useCallback(async (file: File) => {
    setScanErr(null);
    setReport(null);
    try {
      const r = await scanApk(file, file.name, (s) => setStage(s));
      setReport(r);
      setForm((f) => ({ ...f, name: f.name || r.identity.label }));
    } catch (e) {
      setScanErr((e as Error).message);
    } finally {
      setStage(null);
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (kind === 'app' && !report) return setError('Drop your APK first so Sentinel can build the passport.');
    const dl = kind === 'app' ? form.download_url.trim() : form.url.trim();
    if (!/^https:\/\//i.test(dl)) return setError('Links must start with https://');
    setBusy(true);
    try {
      const [{ db, describeFirebaseError }, { addDoc, collection }] = await Promise.all([import('@/firebase'), import('firebase/firestore')]);
      const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const common = {
        slug,
        name: form.name.trim().slice(0, 80),
        tagline: form.tagline.trim().slice(0, 140),
        description: form.description.trim().slice(0, 4000),
        category: form.category || 'Tools',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
        screenshots: [],
        developer_id: user.uid,
        developer_name: user.displayName || 'Independent developer',
        created_at: new Date().toISOString(),
        is_verified: false,
        is_featured: false,
      };
      try {
        if (kind === 'app' && report) {
          await addDoc(collection(db, 'apps'), {
            ...common,
            download_url: dl,
            package_name: report.identity.packageName,
            version: report.identity.versionName ?? '',
            size_bytes: report.file.size,
            passport: toPassport(report),
          });
        } else {
          await addDoc(collection(db, 'websites'), { ...common, url: dl, tech_stack: [], link_report: link ? toLinkPassport(link) : null });
        }
        setDone(`/${kind === 'app' ? 'app' : 'website'}/${slug}`);
      } catch (err) {
        setError(describeFirebaseError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main id="main" className="container-x flex min-h-[90svh] flex-col items-center justify-center pt-28 text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}>
          <CheckCircle2 className="h-16 w-16 text-safe" />
        </motion.div>
        <h1 className="display mt-6 text-5xl">Forged.</h1>
        <p className="mt-3 max-w-md text-ink-2">Your listing is live with its passport. Anyone can now verify their download against your fingerprint.</p>
        <Link to={done} className="mt-8 rounded-full bg-ember px-6 py-3 text-sm font-medium text-void">
          Open your listing
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="relative min-h-[100svh] pb-24 pt-28">
      <div className="container-x max-w-3xl">
        <Eyebrow tone="ember">The Forge</Eyebrow>
        <h1 className="display mt-5 text-[clamp(2.2rem,5vw,4.2rem)]">
          Publish <span className="serif-accent font-normal tracking-normal text-ember-light">with proof.</span>
        </h1>
        <p className="mt-4 text-ink-2">Your APK is analysed in your browser to build its Trust Passport. We store the passport and your https download link — never the file.</p>

        {!ready ? null : !user ? (
          <div className="glass-strong mt-10 rounded-3xl p-8 text-center">
            <p className="font-display text-xl font-bold">Sign in to publish</p>
            <p className="mt-2 text-sm text-ink-3">Listings are tied to your Google account so only you can edit them.</p>
            <Button className="mt-6" onClick={() => void signIn().then((e) => e && setError(e))}>
              Sign in with Google
            </Button>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['app', 'An Android app', 'Drop the APK — Sentinel builds its passport.', Smartphone],
                  ['site', 'A website', 'Paste the URL — Link X-ray checks it live.', Globe],
                ] as const
              ).map(([k, t, b, Icon]) => (
                <button key={k} onClick={() => setKind(k)} className={cn('glass rounded-3xl p-6 text-left transition', kind === k ? 'border-ember/60 bg-ember/10' : 'hover:border-white/25')}>
                  <Icon className={cn('h-6 w-6', k === 'app' ? 'text-ember' : 'text-tide')} />
                  <p className="mt-3 font-display text-lg font-bold">{t}</p>
                  <p className="mt-1 text-sm text-ink-3">{b}</p>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {kind && (
                <motion.form key={kind} onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-strong mt-6 space-y-5 rounded-3xl p-6 sm:p-8">
                  {kind === 'app' && (
                    <div>
                      <Label hint="Analysed locally">APK file</Label>
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center hover:border-ember/50">
                        <input type="file" accept=".apk" className="hidden" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
                        <span className="text-sm text-ink">{stage ? `Sentinel: ${stage}…` : report ? report.file.name : 'Choose your APK'}</span>
                        <span className="text-xs text-ink-3">Package, version and label are filled in for you.</span>
                      </label>
                      {scanErr && <p className="mt-2 text-sm text-danger">{scanErr}</p>}
                      {report && (
                        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4">
                          <TrustRing score={report.score} grade={report.grade} verdict={report.verdict} size={64} stroke={5} />
                          <div className="min-w-0 text-sm">
                            <p className="truncate font-mono text-xs text-ink-3">{report.identity.packageName} · v{report.identity.versionName}</p>
                            <div className="mt-1.5">
                              <VerdictBadge verdict={report.verdict} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <Label>Name</Label>
                      <input required maxLength={80} value={form.name} onChange={set('name')} className={field} />
                    </label>
                    <label>
                      <Label>Category</Label>
                      <select value={form.category} onChange={set('category')} className={field}>
                        <option value="" className="bg-obsidian-900">Choose…</option>
                        {(kind === 'app' ? APP_CATEGORIES : SITE_CATEGORIES).map((c) => (
                          <option key={c} className="bg-obsidian-900">
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <Label hint="140 characters">Tagline</Label>
                    <input required maxLength={140} value={form.tagline} onChange={set('tagline')} className={field} />
                  </label>
                  {kind === 'app' ? (
                    <label className="block">
                      <Label hint="https only">Download link</Label>
                      <input required type="url" placeholder="https://github.com/you/app/releases/…" value={form.download_url} onChange={set('download_url')} className={field} />
                    </label>
                  ) : (
                    <label className="block">
                      <Label hint="https only">Website URL</Label>
                      <input required type="url" placeholder="https://" value={form.url} onChange={set('url')} className={field} />
                      {link && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-ink-3">
                          Link X-ray: <VerdictBadge verdict={link.verdict} /> {link.score}/100
                        </p>
                      )}
                    </label>
                  )}
                  <label className="block">
                    <Label>Description</Label>
                    <textarea required rows={4} maxLength={4000} value={form.description} onChange={set('description')} className={cn(field, 'resize-none')} />
                  </label>
                  <label className="block">
                    <Label hint="comma separated">Tags</Label>
                    <input value={form.tags} onChange={set('tags')} className={field} />
                  </label>
                  {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
                  <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={busy || (kind === 'app' && !report)}>
                      {busy ? 'Forging…' : 'Publish with passport'}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  );
}

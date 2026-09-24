import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Star, Heart, Flag, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { App } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { db, auth } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AppDetail() {
  const { slug } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);

  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "downloaded">("idle");
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, "apps"), where("slug", "==", slug));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) setApp({ id: snap.docs[0].id, ...snap.docs[0].data() } as App);
      else setApp(null);
      setLoading(false);
    }, (err) => { handleFirestoreError(err, OperationType.GET, "apps"); setLoading(false); });
    return () => unsubscribe();
  }, [slug]);

  if (loading) return (
    <div className="container mx-auto pt-32 text-center text-[var(--color-text-muted)]">Loading…</div>
  );
  if (!app) return (
    <div className="container mx-auto pt-32 text-center text-[var(--color-text-muted)]">App not found</div>
  );

  const handleDownload = () => {
    if (downloadState !== "idle") return;
    setDownloadState("downloading");
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setDownloadState("downloaded"); return 100; }
        return p + 5;
      });
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-24">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap text-xs text-[var(--color-text-muted)] mb-8 gap-1.5 items-center">
        <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Apps</Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">{app.category}</span>
        <span>/</span>
        <span className="text-[var(--color-text-primary)] truncate max-w-[150px] sm:max-w-none">{app.name}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.7 }}
          src={app.icon_url}
          alt={app.name}
          className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-2xl shadow-lg object-cover bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]"
        />

        <div className="flex-1 w-full">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1
                style={{ fontFamily: "'DM Serif Display', serif" }}
                className="text-3xl sm:text-4xl md:text-5xl font-normal text-[var(--color-text-primary)]"
              >
                {app.name}
              </h1>
              {app.is_verified && (
                <Badge variant="verified" className="gap-1 whitespace-nowrap">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              )}
            </div>

            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4">{app.tagline}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs mb-6">
              <div className="flex items-center gap-1 text-[var(--color-warning)] font-medium">
                <Star className="w-3.5 h-3.5 fill-current" />
                {app.rating_avg}
                <span className="text-[var(--color-text-muted)] font-normal ml-0.5">({app.rating_count.toLocaleString()})</span>
              </div>
              <span className="text-[var(--color-border-default)]">·</span>
              <span className="text-[var(--color-text-muted)]">{app.version}</span>
              <span className="text-[var(--color-border-default)]">·</span>
              <span className="text-[var(--color-text-muted)]">{(app.size_bytes / 1000000).toFixed(1)} MB</span>
              <span className="text-[var(--color-border-default)]">·</span>
              <span className="text-[var(--color-text-muted)]">{app.min_android}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={handleDownload}
                className={cn(
                  "relative overflow-hidden w-full sm:w-auto sm:min-w-[180px] transition-all duration-300",
                  downloadState === "idle" && "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-0 shadow-[0_4px_20px_rgba(193,123,80,0.35)]",
                  downloadState === "downloading" && "bg-[var(--color-bg-elevated)] text-[var(--color-primary)] border border-[var(--color-border-hover)]",
                  downloadState === "downloaded" && "bg-[var(--color-success)] text-white border-0"
                )}
              >
                {downloadState === "downloading" && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-[var(--color-primary)]/15"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 text-sm font-semibold">
                  {downloadState === "idle" && <><Download className="w-4 h-4" /> Download APK</>}
                  {downloadState === "downloading" && `Downloading… ${progress}%`}
                  {downloadState === "downloaded" && <><CheckCircle2 className="w-4 h-4" /> Downloaded!</>}
                </span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSaved(!saved)}
                className={cn(
                  "rounded-xl border-[var(--color-border-default)] transition-colors",
                  saved && "text-[var(--color-danger)] border-[rgba(217,95,95,0.4)] bg-[rgba(217,95,95,0.08)]"
                )}
              >
                <Heart className={cn("w-4 h-4", saved && "fill-current")} />
              </Button>

              <Button variant="ghost" size="icon" className="rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <Flag className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              {(app.downloads / 1000000).toFixed(1)}M+ downloads
            </p>
          </motion.div>
        </div>
      </div>

      {/* Screenshots */}
      <motion.div
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="mt-14"
      >
        <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl font-normal mb-5 text-[var(--color-text-primary)]">
          Screenshots
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
          {app.screenshots.map((src, i) => (
            <img
              key={i} src={src} alt={`Screenshot ${i + 1}`}
              onClick={() => { setCurrentImage(i); setLightboxOpen(true); }}
              className="h-72 w-auto rounded-xl object-cover cursor-pointer snap-center border border-[var(--color-border-default)] hover:border-[var(--color-border-hover)] transition-colors shadow-sm"
            />
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-14">
        {/* About */}
        <motion.div
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-7"
        >
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl font-normal mb-3 text-[var(--color-text-primary)]">
              About this app
            </h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line text-sm">
              {app.description}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)] uppercase tracking-wide">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {app.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="px-3 py-1 text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Technical Info */}
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="bg-[var(--color-bg-elevated)] border-[var(--color-border-default)]">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)] uppercase tracking-wide">Technical Info</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Package", app.package_name],
                  ["Version", app.version],
                  ["Updated", new Date(app.created_at).toLocaleDateString()],
                  ["Requires", app.min_android],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between border-b border-[var(--color-border-default)] pb-2.5">
                    <span className="text-[var(--color-text-muted)] text-xs">{label}</span>
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] font-mono truncate max-w-[160px]">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-0.5">
                  <span className="text-[var(--color-text-muted)] text-xs">Developer</span>
                  <span className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer">
                    {app.developer_name || app.developer_id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-5 right-5 text-white/50 hover:text-white">
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={() => setCurrentImage(i => (i > 0 ? i - 1 : app.screenshots.length - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <motion.img
              key={currentImage}
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              src={app.screenshots[currentImage]}
              alt={`Screenshot ${currentImage + 1}`}
              className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl"
            />
            <button
              onClick={() => setCurrentImage(i => (i < app.screenshots.length - 1 ? i + 1 : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

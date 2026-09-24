import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Star, ExternalLink, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { App, Website } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { db, auth } from "@/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

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
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const t = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 4);
      setVal(Math.floor(target * ease));
      if (step >= steps) clearInterval(t);
    }, interval);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

export function Home() {
  const [activeTab, setActiveTab] = useState<"apps" | "websites">("apps");
  const [apps, setApps] = useState<App[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  const uploads = useCountUp(12400);
  const downloads = useCountUp(4200000);
  const devs = useCountUp(38000);

  useEffect(() => {
    const appsQ = query(collection(db, "apps"), orderBy("created_at", "desc"));
    const unsub1 = onSnapshot(appsQ, (snap) => {
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as App)));
      setLoading(false);
    }, (err) => { handleFirestoreError(err, OperationType.LIST, "apps"); setLoading(false); });

    const webQ = query(collection(db, "websites"), orderBy("created_at", "desc"));
    const unsub2 = onSnapshot(webQ, (snap) => {
      setWebsites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Website)));
    }, (err) => { handleFirestoreError(err, OperationType.LIST, "websites"); });

    return () => { unsub1(); unsub2(); };
  }, []);

  const items = activeTab === "apps" ? apps : websites;

  return (
    <div className="relative">
      {/* Hero */}
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary-light)] border border-[rgba(193,123,80,0.25)] text-xs font-semibold text-[var(--color-primary)] tracking-wide uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
            Free · Open · Always
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.12] tracking-tight text-[var(--color-text-primary)]"
          >
            Apps & Sites,{" "}
            <em className="not-italic" style={{ color: "var(--color-primary)" }}>
              All in One Place
            </em>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.8 }}
            className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed"
          >
            Download free Android APKs and discover the best websites.
            12,000+ apps and sites, verified by the community.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-0 shadow-[0_4px_20px_rgba(193,123,80,0.35)] gap-2"
              onClick={() => setActiveTab("apps")}
            >
              Browse Apps <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setActiveTab("websites")}
            >
              Discover Websites
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 w-full border-t border-[var(--color-border-default)] mt-4"
          >
            {[
              [uploads.toLocaleString() + "+", "Uploads"],
              [(downloads / 1000000).toFixed(1) + "M+", "Downloads"],
              [(devs / 1000).toFixed(0) + "K+", "Developers"],
              ["99.9%", "Uptime"],
            ].map(([num, label]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  className="text-2xl sm:text-3xl text-[var(--color-text-primary)]"
                >
                  {num}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mt-14 mb-8 px-4">
          <div className="inline-flex items-center p-1 bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border-default)] w-full sm:w-auto">
            {(["apps", "websites"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "relative flex-1 sm:flex-none px-6 sm:px-10 py-2.5 rounded-lg text-sm font-medium transition-colors z-10",
                  activeTab === t
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                {activeTab === t && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[var(--color-bg-card)] border border-[var(--color-border-hover)] rounded-lg -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                {t === "apps" ? "📱 Apps" : "🌐 Websites"}
              </button>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
            <span>✦</span>
            Featured {activeTab === "apps" ? "Apps" : "Websites"}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto scrollbar-hide snap-x">
            {["All", "Photography", "Productivity", "Games", "E-commerce", "Developer Tools"].map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="cursor-pointer whitespace-nowrap px-3 py-1 text-xs snap-start hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center py-20 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-default)]"
            >
              <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-display font-normal mb-2 text-[var(--color-text-primary)]">
                No {activeTab} yet
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6 text-sm">
                Be the first to upload your {activeTab === "apps" ? "app" : "website"}!
              </p>
              <Link to="/upload">
                <Button className="bg-[var(--color-primary)] text-white border-0">
                  Upload Now
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {items.map((item: any, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                >
                  <Link to={`/${activeTab}/${item.slug}`}>
                    <Card className="card-glow h-full flex flex-col overflow-hidden group border-[var(--color-border-default)]">
                      <CardContent className="p-5 flex-grow flex flex-col">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={item.icon_url || item.thumbnail_url}
                            alt={item.name}
                            className={cn(
                              "object-cover bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]",
                              activeTab === "apps"
                                ? "w-12 h-12 rounded-xl flex-shrink-0"
                                : "w-full h-28 rounded-lg mb-1"
                            )}
                          />
                          {activeTab === "apps" && (
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm leading-tight truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                                {item.name}
                              </h3>
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                                {item.category}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3 h-3 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{item.rating_avg}</span>
                                <span className="text-xs text-[var(--color-text-muted)]">({item.rating_count})</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {activeTab === "websites" && (
                          <div className="mb-2">
                            <h3 className="font-semibold text-sm truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{item.rating_avg}</span>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-3 flex-grow leading-relaxed">
                          {item.tagline}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border-default)]">
                          {activeTab === "apps" ? (
                            <>
                              <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                <Download className="w-3 h-3" />
                                {(item.downloads / 1000000).toFixed(1)}M
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {item.size_bytes ? `${(item.size_bytes / 1000000).toFixed(0)} MB` : "Free"}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <div className="flex gap-1 flex-wrap">
                                {item.tech_stack?.slice(0, 2).map((tech: string) => (
                                  <Badge key={tech} variant="secondary" className="text-[10px] px-2 py-0">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload CTA */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative rounded-2xl overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-8 sm:p-12 text-center"
        >
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(193,123,80,0.25) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
          />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-widest mb-3">Share your work</p>
            <h2 className="text-2xl sm:text-3xl font-display font-normal mb-3 text-[var(--color-text-primary)]">
              Have something to share?
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-7 text-sm leading-relaxed">
              Upload your APK or website and reach 38K+ developers and enthusiasts worldwide.
            </p>
            <Link to="/upload" className="block sm:inline-block">
              <Button size="lg" className="w-full sm:w-auto bg-[var(--color-text-primary)] text-[var(--color-bg-base)] hover:bg-[var(--color-text-secondary)] font-semibold gap-2">
                Upload Now <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

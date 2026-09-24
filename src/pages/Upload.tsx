import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Globe, UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { db, auth } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";

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

export function Upload() {
  const [type, setType] = useState<"app" | "website" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [packageName, setPackageName] = useState("");
  const [version, setVersion] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) { setError("You must be signed in to upload."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      if (type === "app") {
        await addDoc(collection(db, "apps"), {
          name, slug, tagline, description,
          package_name: packageName, version,
          developer_id: auth.currentUser.uid,
          developer_name: auth.currentUser.displayName || "Unknown Developer",
          icon_url: "https://picsum.photos/seed/" + slug + "/200/200",
          screenshots: [
            "https://picsum.photos/seed/" + slug + "1/400/800",
            "https://picsum.photos/seed/" + slug + "2/400/800",
            "https://picsum.photos/seed/" + slug + "3/400/800"
          ],
          apk_url: "#", min_android: "Android 8.0+",
          size_bytes: Math.floor(Math.random() * 100000000),
          category: "Tools", tags: ["New", "App"],
          downloads: 0, rating_avg: 0, rating_count: 0,
          is_verified: false, is_featured: false,
          created_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "websites"), {
          name, slug, tagline, description, url,
          developer_id: auth.currentUser.uid,
          developer_name: auth.currentUser.displayName || "Unknown Developer",
          thumbnail_url: "https://picsum.photos/seed/" + slug + "/800/400",
          screenshots: [
            "https://picsum.photos/seed/" + slug + "1/800/400",
            "https://picsum.photos/seed/" + slug + "2/800/400"
          ],
          category: "Tools", tags: ["New", "Website"],
          tech_stack: ["React", "Tailwind"],
          views: 0, rating_avg: 0, rating_count: 0,
          is_verified: false, is_featured: false,
          created_at: new Date().toISOString()
        });
      }
      setIsSuccess(true);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, type === "app" ? "apps" : "websites");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-24 text-center max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.45 }}
          className="w-20 h-20 bg-[var(--color-secondary-light)] rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-[var(--color-success)]" />
        </motion.div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl font-normal mb-3 text-[var(--color-text-primary)]">
          Submitted!
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8 text-sm leading-relaxed">
          Your {type === "app" ? "app" : "website"} has been submitted and is under review. Usually takes 24–48 hours.
        </p>
        <Button onClick={() => window.location.href = "/"} className="w-full bg-[var(--color-primary)] text-white border-0">
          Return to Home
        </Button>
      </div>
    );
  }

  const inputCls = "w-full h-10 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border-default)] focus:border-[var(--color-border-active)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-colors text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]";

  return (
    <div className="container mx-auto px-4 pt-14 pb-24 max-w-2xl">
      <div className="text-center mb-10">
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-4xl font-normal mb-3 text-[var(--color-text-primary)]">
          Share with the Community
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Upload your APK or submit your website to reach thousands of users.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!type ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Card
              className="card-glow cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
              onClick={() => setType("app")}
            >
              <CardContent className="p-7 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(193,123,80,0.35)]">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl font-normal mb-1.5 text-[var(--color-text-primary)]">
                    Upload APK
                  </h3>
                  <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
                    Share your Android app with the world. Free hosting and distribution.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="card-glow cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
              onClick={() => setType("website")}
            >
              <CardContent className="p-7 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-secondary-light)] border border-[rgba(91,138,107,0.3)] flex items-center justify-center">
                  <Globe className="w-7 h-7 text-[var(--color-secondary)]" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl font-normal mb-1.5 text-[var(--color-text-primary)]">
                    Submit Website
                  </h3>
                  <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
                    Showcase your web app, portfolio, or tool to developers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-default)] rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-7 pb-5 border-b border-[var(--color-border-default)]">
              <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl font-normal flex items-center gap-3 text-[var(--color-text-primary)]">
                {type === "app"
                  ? <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
                  : <Globe className="w-5 h-5 text-[var(--color-secondary)]" />
                }
                {type === "app" ? "Upload APK" : "Submit Website"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setType(null)} className="text-xs">
                Change
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-lg bg-[rgba(217,95,95,0.08)] border border-[rgba(217,95,95,0.3)] text-[var(--color-danger)] text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} type="text" className={inputCls} placeholder="e.g. NovaCam" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Tagline</label>
                  <input required value={tagline} onChange={e => setTagline(e.target.value)} type="text" className={inputCls} placeholder="Short description" />
                </div>
              </div>

              {type === "app" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Package Name</label>
                    <input required value={packageName} onChange={e => setPackageName(e.target.value)} type="text" className={inputCls} placeholder="com.example.app" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Version</label>
                    <input required value={version} onChange={e => setVersion(e.target.value)} type="text" className={inputCls} placeholder="1.0.0" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Website URL</label>
                  <input required value={url} onChange={e => setUrl(e.target.value)} type="url" className={inputCls} placeholder="https://" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Description</label>
                <textarea
                  required value={description} onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border-default)] focus:border-[var(--color-border-active)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-colors resize-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                  placeholder="Full description…"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  {type === "app" ? "APK File" : "Thumbnail Image"}
                </label>
                <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-xl p-8 text-center hover:border-[var(--color-border-hover)] hover:bg-[var(--color-primary-light)] transition-all cursor-pointer">
                  <UploadCloud className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-3" />
                  <p className="text-sm text-[var(--color-text-secondary)] font-medium">
                    Drag and drop, or click to browse
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {type === "app" ? "Max size: 500 MB (.apk)" : "Max size: 5 MB (.png, .jpg)"}
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--color-border-default)] flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setType(null)} className="w-full sm:w-auto text-sm">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-w-[110px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-0 text-sm"
                >
                  {isSubmitting ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

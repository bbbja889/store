import type { ApkReport, Composition, Grade, Severity, Verdict } from '@/sentinel/types';
import type { LinkReport } from '@/sentinel/url/inspect';

/** The compact, Firestore-friendly summary of a Sentinel report that travels with a listing. */
export interface Passport {
  engine: string;
  scanned_at: string;
  score: number;
  grade: Grade;
  verdict: Verdict;
  sha256: string;
  size_bytes: number;
  package_name: string;
  label: string;
  version_name: string | null;
  version_code: number | null;
  min_sdk: number | null;
  target_sdk: number | null;
  signature: {
    schemes: string[];
    verified: boolean | null;
    cert_sha256: string | null;
    cert_subject: string | null;
    debug_cert: boolean;
  };
  permissions: string[];
  trackers: string[];
  signals: string[];
  flags: { debuggable: boolean; cleartext: boolean; allow_backup: boolean };
  composition: Composition;
  findings: { id: string; severity: Severity; title: string; detail: string }[];
}

export interface LinkPassport {
  score: number;
  grade: Grade;
  verdict: Verdict;
  host: string;
  unicode_host: string;
  findings: { id: string; severity: Severity; title: string }[];
}

export function toPassport(r: ApkReport): Passport {
  return {
    engine: r.engine,
    scanned_at: r.scannedAt,
    score: r.score,
    grade: r.grade,
    verdict: r.verdict,
    sha256: r.file.sha256,
    size_bytes: r.file.size,
    package_name: r.identity.packageName,
    label: r.identity.label,
    version_name: r.identity.versionName,
    version_code: r.identity.versionCode,
    min_sdk: r.identity.minSdk,
    target_sdk: r.identity.targetSdk,
    signature: {
      schemes: r.signing.schemes,
      verified: r.signing.verified,
      cert_sha256: r.signing.cert?.sha256 ?? null,
      cert_subject: r.signing.cert?.subject ?? null,
      debug_cert: !!(r.signing.cert?.debugKey || r.signing.cert?.aospTestKey),
    },
    permissions: r.permissions.map((p) => p.name),
    trackers: r.code.trackers.map((t) => t.id),
    signals: r.code.signals.map((s) => s.id),
    flags: { debuggable: r.flags.debuggable, cleartext: r.flags.cleartextTraffic, allow_backup: r.flags.allowBackup },
    composition: r.composition,
    findings: r.findings.slice(0, 12).map((f) => ({ id: f.id, severity: f.severity, title: f.title, detail: f.detail })),
  };
}

export function toLinkPassport(r: LinkReport): LinkPassport {
  return {
    score: r.score,
    grade: r.grade,
    verdict: r.verdict,
    host: r.host,
    unicode_host: r.unicodeHost,
    findings: r.findings.slice(0, 10).map((f) => ({ id: f.id, severity: f.severity, title: f.title })),
  };
}

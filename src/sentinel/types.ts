import type { PermissionInfo } from './knowledge/permissions';
import type { TrackerHit } from './knowledge/trackers';

export type Severity = 'info' | 'good' | 'low' | 'medium' | 'high' | 'critical';
export type FindingCategory = 'signature' | 'combo' | 'permissions' | 'trackers' | 'code' | 'manifest' | 'integrity';
export type Verdict = 'clean' | 'caution' | 'danger';
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  detail: string;
  /** Points deducted from 100 (after caps are applied this may be reduced). */
  penalty: number;
}

export interface CertSummary {
  subject: string;
  issuer: string;
  commonName: string | null;
  organization: string | null;
  serial: string;
  notBefore: string | null;
  notAfter: string | null;
  signatureAlgorithm: string;
  keyAlgorithm: string;
  keyBits: number | null;
  sha256: string;
  sha1: string;
  debugKey: boolean;
  aospTestKey: boolean;
}

export interface SignerSummary {
  scheme: string;
  algorithm: string | null;
  signatureValid: boolean | null;
  digestValid: boolean | null;
  note?: string;
  certSha256: string | null;
}

export interface PermissionEntry {
  name: string;
  short: string;
  info: PermissionInfo | null;
  custom: boolean;
}

export type Stage = 'read' | 'unzip' | 'manifest' | 'code' | 'signature' | 'score' | 'done';

export interface Composition {
  dex: number;
  native: number;
  resources: number;
  assets: number;
  manifest: number;
  signatures: number;
  other: number;
}

export interface ApkReport {
  engine: 'sentinel@2';
  scannedAt: string;
  durationMs: number;
  file: { name: string; size: number; sha256: string; entries: number };
  identity: {
    packageName: string;
    label: string;
    versionName: string | null;
    versionCode: number | null;
    minSdk: number | null;
    targetSdk: number | null;
    compileSdk: number | null;
  };
  icon: { mime: string; bytes: Uint8Array } | null;
  signing: {
    schemes: string[];
    verified: boolean | null;
    signers: SignerSummary[];
    cert: CertSummary | null;
    extraBlocks: string[];
  };
  permissions: PermissionEntry[];
  components: {
    activities: number;
    services: number;
    receivers: number;
    providers: number;
    hasLauncher: boolean;
    exportedUnprotected: string[];
    accessibilityServices: string[];
    deviceAdmin: boolean;
    notificationListener: boolean;
    bootReceiver: boolean;
  };
  flags: {
    debuggable: boolean;
    cleartextTraffic: boolean;
    cleartextExplicit: boolean;
    allowBackup: boolean;
    testOnly: boolean;
    networkSecurityConfig: boolean;
    sharedUserId: string | null;
  };
  code: {
    dexFiles: number;
    classes: number;
    methods: number;
    referencedTypes: number;
    trackers: TrackerHit[];
    signals: { id: string; title: string }[];
  };
  native: { abis: string[]; libs: string[]; packers: string[] };
  composition: Composition;
  score: number;
  grade: Grade;
  verdict: Verdict;
  findings: Finding[];
}

export type ProgressFn = (stage: Stage, detail?: string) => void;

/**
 * Builds a synthetic APK for every fictional demo app and runs it through the real Sentinel engine,
 * writing the resulting Trust Passports to src/data/demo-passports.json.
 * Run with: npx vite-node scripts/build-demo-catalog.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — plain ESM helper
import { buildApk, encodeDex, launcherActivity, makeSigner, manifest } from './lib/apk-builder.mjs';
// @ts-expect-error — plain ESM helper
import { cleanSample, iconPng } from './lib/samples.mjs';
import { analyzeApk } from '../src/sentinel/analyze';
import { toPassport } from '../src/data/passport';

interface Spec {
  slug: string;
  pkg: string;
  label: string;
  version: string;
  code: number;
  min?: number;
  target?: number;
  perms: string[];
  classes?: string[];
  methods?: string[];
  app?: Record<string, unknown>;
  components?: unknown[];
  signer: 'release' | 'debug';
  padding?: number;
}

const release = makeSigner([['C', 'IN'], ['O', 'VICZO Labs'], ['CN', 'VICZO Demo Release']]);
const debug = makeSigner([['C', 'US'], ['O', 'Android'], ['CN', 'Android Debug']]);

const specs: Spec[] = [
  {
    slug: 'lumen-reader', pkg: 'com.viczo.demo.lumen', label: 'Lumen Reader', version: '3.1.2', code: 312, target: 35,
    perms: ['INTERNET', 'READ_MEDIA_IMAGES', 'POST_NOTIFICATIONS'],
    classes: ['com.google.firebase.analytics.FirebaseAnalytics', 'com.google.firebase.crashlytics.FirebaseCrashlytics'],
    app: { allowBackup: false }, signer: 'release', padding: 380_000,
  },
  {
    slug: 'pulsefit', pkg: 'com.viczo.demo.pulsefit', label: 'PulseFit', version: '5.0.4', code: 504, target: 34,
    perms: ['INTERNET', 'ACTIVITY_RECOGNITION', 'BODY_SENSORS', 'ACCESS_FINE_LOCATION', 'BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN', 'POST_NOTIFICATIONS', 'FOREGROUND_SERVICE'],
    classes: ['com.google.firebase.analytics.FirebaseAnalytics', 'com.appsflyer.AppsFlyerLib', 'com.onesignal.OneSignal'],
    app: { allowBackup: false }, signer: 'release', padding: 900_000,
  },
  {
    slug: 'novacam', pkg: 'com.viczo.demo.novacam', label: 'NovaCam', version: '2.8.0', code: 280, target: 33,
    perms: ['CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'INTERNET', 'com.google.android.gms.permission.AD_ID'],
    classes: ['com.google.android.gms.ads.AdView', 'com.facebook.ads.AdView', 'com.unity3d.ads.UnityAds'],
    signer: 'release', padding: 1_400_000,
  },
  {
    slug: 'tidepool-chat', pkg: 'com.viczo.demo.tidepool', label: 'Tidepool Chat', version: '1.12.0', code: 1120, target: 35,
    perms: ['INTERNET', 'CAMERA', 'RECORD_AUDIO', 'READ_CONTACTS', 'POST_NOTIFICATIONS', 'USE_BIOMETRIC', 'FOREGROUND_SERVICE'],
    classes: ['javax.crypto.Cipher'],
    app: { allowBackup: false }, signer: 'release', padding: 650_000,
  },
  {
    slug: 'quill-keyboard', pkg: 'com.viczo.demo.quill', label: 'Quill Keyboard', version: '4.0.1', code: 401, target: 35,
    perms: ['VIBRATE'],
    app: { allowBackup: false },
    components: [{ name: 'service', attrs: { name: 'com.viczo.demo.quill.Ime', permission: 'android.permission.BIND_INPUT_METHOD', exported: true } }],
    signer: 'release', padding: 240_000,
  },
  {
    slug: 'pocket-ledger', pkg: 'com.viczo.demo.ledger', label: 'Pocket Ledger', version: '2.2.0', code: 220, target: 30,
    perms: ['READ_SMS', 'RECEIVE_SMS', 'INTERNET', 'READ_CONTACTS', 'POST_NOTIFICATIONS'],
    classes: ['com.google.firebase.analytics.FirebaseAnalytics', 'com.clevertap.android.sdk.CleverTapAPI'],
    signer: 'release', padding: 520_000,
  },
  {
    slug: 'beacon-maps', pkg: 'com.viczo.demo.beacon', label: 'Beacon Maps', version: '0.9.3-beta', code: 93, target: 34,
    perms: ['INTERNET', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'POST_NOTIFICATIONS'],
    app: { debuggable: true },
    signer: 'debug', padding: 1_100_000,
  },
];

const out: Record<string, unknown> = {};

const clean = await analyzeApk(new Uint8Array(cleanSample(release)), 'orbit-notes.apk');
out['orbit-notes'] = toPassport(clean);

for (const s of specs) {
  const apk = buildApk({
    signer: s.signer === 'release' ? release : debug,
    files: [
      { name: 'AndroidManifest.xml', data: manifest({ pkg: s.pkg, versionName: s.version, versionCode: s.code, label: s.label, minSdk: s.min ?? 26, targetSdk: s.target ?? 35, permissions: s.perms, application: s.app ?? {}, components: [launcherActivity(`${s.pkg}.MainActivity`), ...(s.components ?? [])] }) },
      { name: 'classes.dex', data: encodeDex({ classes: [`${s.pkg}.MainActivity`, 'androidx.appcompat.app.AppCompatActivity', ...(s.classes ?? [])], methods: s.methods ?? [] }) },
      { name: 'res/mipmap-xxhdpi/ic_launcher.png', data: iconPng(144) },
      // Deterministic filler so the composition bar has realistic proportions.
      { name: 'assets/data.bin', data: Buffer.alloc(s.padding ?? 100_000, 7) },
    ],
  });
  const report = await analyzeApk(new Uint8Array(apk), `${s.slug}.apk`);
  out[s.slug] = toPassport(report);
  console.log(`${s.slug.padEnd(16)} ${report.score} ${report.grade} ${report.verdict}`);
}

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'demo-passports.json');
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log('wrote', file);

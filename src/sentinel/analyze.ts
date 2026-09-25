/**
 * Sentinel orchestrator: turns APK bytes into an explained Trust report.
 * Pure (no DOM) so it runs in a Web Worker and in unit tests.
 */
import { sha, toHex } from './bytes';
import { child, findAll, parseAxml, type AxmlElement } from './axml';
import { parseArsc, resolveFiles, resolveString } from './arsc';
import { parseDex } from './dex';
import { analyseSigning } from './signing';
import type { CertInfo } from './x509';
import { readEntry, readZipIndex, type ZipEntry } from './zip';
import { lookupPermission, shortPermission } from './knowledge/permissions';
import { detectTrackers } from './knowledge/trackers';
import { scoreFindings } from './score';
import type { ApkReport, CertSummary, Composition, Finding, PermissionEntry, ProgressFn } from './types';

const PACKERS: [RegExp, string][] = [
  [/libjiagu/i, 'Qihoo 360 Jiagu'],
  [/libsecexe|libsecmain/i, 'Bangcle'],
  [/libDexHelper/i, 'SecNeo'],
  [/libshell[a-z-]*\.so|libshella/i, 'Tencent Legu'],
  [/libmobisec/i, 'Alibaba Mobisec'],
  [/libexecmain|libexec\.so/i, 'Ijiami'],
  [/libAPKProtect/i, 'APKProtect'],
  [/libkwscmm|libkwslinker/i, 'Kiwisec'],
  [/libnqshield/i, 'NQ Shield'],
];

function toCertSummary(c: CertInfo | null): CertSummary | null {
  if (!c) return null;
  const cn = c.subject.CN ?? null;
  const o = c.subject.O ?? null;
  return {
    subject: c.subjectText,
    issuer: c.issuerText,
    commonName: cn,
    organization: o,
    serial: c.serial,
    notBefore: c.notBefore,
    notAfter: c.notAfter,
    signatureAlgorithm: c.signatureAlgorithm,
    keyAlgorithm: c.keyAlgorithm,
    keyBits: c.keyBits,
    sha256: c.sha256,
    sha1: c.sha1,
    debugKey: cn === 'Android Debug' && o === 'Android',
    aospTestKey: cn === 'Android' && o === 'Android' && c.subject.E === 'android@android.com',
  };
}

function classify(e: ZipEntry): keyof Composition {
  const n = e.name;
  if (/^classes\d*\.dex$/.test(n)) return 'dex';
  if (n.startsWith('lib/')) return 'native';
  if (n.startsWith('res/') || n === 'resources.arsc') return 'resources';
  if (n.startsWith('assets/')) return 'assets';
  if (n === 'AndroidManifest.xml') return 'manifest';
  if (/^META-INF\/[^/]+\.(SF|RSA|DSA|EC|MF)$/i.test(n)) return 'signatures';
  return 'other';
}

const bool = (v: unknown) => v === true || v === 'true';
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : null);

function hasIntent(el: AxmlElement, action: string, category?: string) {
  return findAll(el, 'intent-filter').some(
    (f) =>
      findAll(f, 'action').some((a) => a.attrs.name === action) &&
      (!category || findAll(f, 'category').some((c) => c.attrs.name === category)),
  );
}

export async function analyzeApk(input: Uint8Array, fileName: string, onProgress: ProgressFn = () => {}): Promise<ApkReport> {
  const t0 = performance.now();
  onProgress('read', `${(input.length / 1048576).toFixed(1)} MB`);
  const sha256 = toHex(await sha('SHA-256', input));

  onProgress('unzip');
  const zip = readZipIndex(input);
  const manifestEntry = zip.byName.get('AndroidManifest.xml');
  if (!manifestEntry) throw new Error('This ZIP has no AndroidManifest.xml — it is not an APK.');

  onProgress('manifest', `${zip.entries.length} entries`);
  const manifest = parseAxml(readEntry(input, manifestEntry));
  const arscEntry = zip.byName.get('resources.arsc');
  let table: ReturnType<typeof parseArsc>;
  try {
    table = arscEntry ? parseArsc(readEntry(input, arscEntry)) : undefined;
  } catch {
    table = undefined;
  }

  const app = child(manifest, 'application');
  const usesSdk = child(manifest, 'uses-sdk');
  const packageName = String(manifest.attrs.package ?? 'unknown');
  const label =
    resolveString(table, app?.attrs.label) ??
    packageName.split('.').pop()!.replace(/^\w/, (c) => c.toUpperCase());

  // Icon: highest-density bitmap we can find.
  let icon: ApkReport['icon'] = null;
  const iconCandidates = [...resolveFiles(table, app?.attrs.icon), ...resolveFiles(table, app?.attrs.roundIcon)];
  const fallbackIcons = zip.entries
    .filter((e) => /^res\/mipmap-[^/]*\/ic_launcher[^/]*\.(png|webp)$/i.test(e.name))
    .sort((a, b) => b.size - a.size)
    .map((e) => e.name);
  for (const path of [...iconCandidates, ...fallbackIcons]) {
    const e = zip.byName.get(path);
    if (e && /\.(png|webp)$/i.test(path) && e.size < 2_000_000) {
      try {
        icon = { mime: path.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png', bytes: readEntry(input, e) };
        break;
      } catch {
        /* try next */
      }
    }
  }

  // Permissions
  const permNames = new Set<string>();
  for (const tag of ['uses-permission', 'uses-permission-sdk-23', 'uses-permission-sdk-m']) {
    for (const p of findAll(manifest, tag)) if (typeof p.attrs.name === 'string') permNames.add(p.attrs.name);
  }
  const permissions: PermissionEntry[] = [...permNames].map((name) => {
    const info = lookupPermission(name) ?? null;
    return { name, short: shortPermission(name), info, custom: !info && !name.startsWith('android.permission.') };
  });
  const has = (short: string) => permNames.has(`android.permission.${short}`) || permNames.has(short);

  // Components
  const activities = [...findAll(manifest, 'activity'), ...findAll(manifest, 'activity-alias')];
  const services = findAll(manifest, 'service');
  const receivers = findAll(manifest, 'receiver');
  const providers = findAll(manifest, 'provider');
  const targetSdk = num(usesSdk?.attrs.targetSdkVersion);
  const exportedUnprotected: string[] = [];
  for (const el of [...activities, ...services, ...receivers, ...providers]) {
    const exp = el.attrs.exported;
    const hasFilter = findAll(el, 'intent-filter').length > 0;
    const exported = exp === undefined ? hasFilter && (targetSdk ?? 0) < 31 : bool(exp);
    if (exported && !el.attrs.permission && !hasIntent(el, 'android.intent.action.MAIN', 'android.intent.category.LAUNCHER')) {
      exportedUnprotected.push(String(el.attrs.name ?? '?'));
    }
  }
  const accessibilityServices = services
    .filter((s) => s.attrs.permission === 'android.permission.BIND_ACCESSIBILITY_SERVICE')
    .map((s) => String(s.attrs.name));
  const notificationListener = services.some((s) => s.attrs.permission === 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE');
  const deviceAdmin = receivers.some((r) => r.attrs.permission === 'android.permission.BIND_DEVICE_ADMIN');
  const keyboard = services.some((s) => s.attrs.permission === 'android.permission.BIND_INPUT_METHOD');
  const vpn = services.some((s) => s.attrs.permission === 'android.permission.BIND_VPN_SERVICE');
  const hasLauncher = activities.some((a) => hasIntent(a, 'android.intent.action.MAIN', 'android.intent.category.LAUNCHER'));
  const bootReceiver = receivers.some((r) => hasIntent(r, 'android.intent.action.BOOT_COMPLETED'));
  const isTestApk = findAll(manifest, 'instrumentation').length > 0;

  // Code
  onProgress('code');
  const dexEntries = zip.entries.filter((e) => /^classes\d*\.dex$/.test(e.name));
  const allTypes = new Set<string>();
  const methodRefs = new Set<string>();
  const strings = new Set<string>();
  let classes = 0;
  let methods = 0;
  for (let i = 0; i < dexEntries.length; i++) {
    onProgress('code', `${dexEntries[i].name} (${i + 1}/${dexEntries.length})`);
    try {
      const d = parseDex(readEntry(input, dexEntries[i]));
      classes += d.classCount;
      methods += d.methodCount;
      for (const t of d.types) allTypes.add(t);
      d.methodRefs.forEach((r) => methodRefs.add(r));
      d.interestingStrings.forEach((s) => strings.add(s));
    } catch {
      /* corrupt or encrypted dex — packers do this */
    }
  }
  const trackers = detectTrackers(allTypes);
  const refs = (cls: string, ...names: string[]) => names.some((n) => methodRefs.has(`${cls}#${n}`));
  const signals: { id: string; title: string }[] = [];
  const dynamicLoading =
    allTypes.has('dalvik.system.DexClassLoader') || allTypes.has('dalvik.system.InMemoryDexClassLoader');
  if (dynamicLoading) signals.push({ id: 'dynamic-code', title: 'Loads code at runtime (DexClassLoader)' });
  const shell = refs('java.lang.Runtime', 'exec') || refs('java.lang.ProcessBuilder', 'start');
  if (shell) signals.push({ id: 'shell', title: 'Runs shell commands' });
  const smsSend = refs('android.telephony.SmsManager', 'sendTextMessage', 'sendMultipartTextMessage', 'sendDataMessage');
  if (smsSend) signals.push({ id: 'sms-send', title: 'Contains code that sends SMS' });
  const deviceAdminCode = refs('android.app.admin.DevicePolicyManager', 'lockNow', 'wipeData', 'resetPassword');
  if (deviceAdminCode) signals.push({ id: 'device-admin-code', title: 'Can lock or wipe the device' });
  const screenCapture = allTypes.has('android.media.projection.MediaProjectionManager');
  if (screenCapture) signals.push({ id: 'screen-capture', title: 'Can capture the screen' });
  const jsBridge = strings.has('addjavascriptinterface') || refs('android.webkit.WebView', 'addJavascriptInterface');
  if (jsBridge) signals.push({ id: 'js-bridge', title: 'Exposes Java to web pages (JavaScript bridge)' });
  const installer = allTypes.has('android.content.pm.PackageInstaller') && has('REQUEST_INSTALL_PACKAGES');
  if (installer) signals.push({ id: 'installer', title: 'Can install other APKs' });
  const rootCheck = ['/system/xbin/su', '/system/bin/su', 'superuser.apk', 'magisk', 'com.noshufou.android.su'].some((s) => strings.has(s));
  if (rootCheck) signals.push({ id: 'root-check', title: 'Looks for root access' });
  const emuCheck = ['goldfish', 'ranchu', 'genymotion', 'generic_x86'].some((s) => strings.has(s));
  if (emuCheck) signals.push({ id: 'emulator-check', title: 'Checks whether it runs in an emulator' });
  const hookCheck = strings.has('frida') || strings.has('xposed');
  if (hookCheck) signals.push({ id: 'hook-check', title: 'Looks for hooking tools (Frida/Xposed)' });

  // Native
  const libs = zip.entries.filter((e) => /^lib\/[^/]+\/[^/]+\.so$/.test(e.name));
  const abis = [...new Set(libs.map((e) => e.name.split('/')[1]))];
  const libNames = [...new Set(libs.map((e) => e.name.split('/').pop()!))];
  const packers = [...new Set(PACKERS.filter(([re]) => libNames.some((l) => re.test(l))).map(([, n]) => n))];

  // Signature
  onProgress('signature');
  const signing = await analyseSigning(input, zip);
  const cert = toCertSummary(signing.primaryCert);

  // Composition
  const composition: Composition = { dex: 0, native: 0, resources: 0, assets: 0, manifest: 0, signatures: 0, other: 0 };
  for (const e of zip.entries) composition[classify(e)] += e.compressedSize;

  const flagsRaw = app?.attrs ?? {};
  const cleartextExplicit = flagsRaw.usesCleartextTraffic !== undefined;
  const flags = {
    debuggable: bool(flagsRaw.debuggable),
    cleartextTraffic: cleartextExplicit ? bool(flagsRaw.usesCleartextTraffic) : (targetSdk ?? 0) < 28 && !flagsRaw.networkSecurityConfig,
    cleartextExplicit,
    allowBackup: flagsRaw.allowBackup === undefined ? true : bool(flagsRaw.allowBackup),
    testOnly: bool(flagsRaw.testOnly),
    networkSecurityConfig: !!flagsRaw.networkSecurityConfig,
    sharedUserId: typeof manifest.attrs.sharedUserId === 'string' ? manifest.attrs.sharedUserId : null,
  };

  onProgress('score');
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // — Signature & integrity
  if (signing.schemes.length === 0) {
    add({ id: 'unsigned', category: 'signature', severity: 'critical', penalty: 60, title: 'Not signed', detail: 'Android refuses to install unsigned APKs. This file was never through a real release process — or its signature was stripped.' });
  } else if (signing.verified === false) {
    const broken = signing.signers.find((s) => s.signatureValid === false || s.digestValid === false);
    add({ id: 'bad-signature', category: 'integrity', severity: 'critical', penalty: 70, title: 'Signature does not verify', detail: `${broken?.note ?? 'The signature check failed.'} Android will reject it; if it was shared anyway, it was likely tampered with.` });
  } else if (signing.verified === true) {
    const s = signing.signers.find((x) => x.signatureValid === true)!;
    add({ id: 'signature-verified', category: 'signature', severity: 'good', penalty: 0, title: `Signature verified (${s.scheme})`, detail: `${s.algorithm}. ${s.digestValid ? 'Every byte of the APK matches what the developer signed.' : s.note ?? ''}` });
  }
  if (cert?.aospTestKey) {
    add({ id: 'aosp-test-key', category: 'signature', severity: 'critical', penalty: 30, title: 'Signed with Android’s public test key', detail: 'The AOSP test key is published openly. Anyone can sign a "legit-looking" update with it — no identity is proven.' });
  } else if (cert?.debugKey) {
    add({ id: 'debug-key', category: 'signature', severity: 'high', penalty: 22, title: 'Signed with a debug key', detail: 'Debug keys are auto-generated on a developer machine. Real releases are signed with a private release key.' });
  }
  if (signing.schemes.length === 1 && signing.schemes[0] === 'v1' && ((num(usesSdk?.attrs.minSdkVersion) ?? 1) < 26)) {
    add({ id: 'janus', category: 'signature', severity: 'medium', penalty: 8, title: 'Only the old v1 signature', detail: 'v1-only APKs installed on Android 5.0–8.0 are exposed to the "Janus" flaw (CVE-2017-13156), which lets code be injected without breaking the signature.' });
  }
  if (cert && (/SHA-1|MD5/.test(cert.signatureAlgorithm) || (cert.keyAlgorithm === 'RSA' && (cert.keyBits ?? 2048) < 2048))) {
    add({ id: 'weak-crypto', category: 'signature', severity: 'medium', penalty: 6, title: 'Weak signing cryptography', detail: `${cert.signatureAlgorithm}${cert.keyBits ? `, ${cert.keyBits}-bit key` : ''}. Modern releases use SHA-256 and ≥ 2048-bit RSA or ECDSA.` });
  }

  // — Combos (the patterns real malware families rely on)
  const sms = has('READ_SMS') || has('RECEIVE_SMS');
  const overlay = has('SYSTEM_ALERT_WINDOW');
  if (accessibilityServices.length && overlay && sms) {
    add({ id: 'combo-banker', category: 'combo', severity: 'critical', penalty: 35, title: 'Banking-trojan toolkit', detail: 'Accessibility service + drawing over other apps + reading SMS. Together these let an app show fake login screens over your bank and read the OTP.' });
  } else if (accessibilityServices.length && sms) {
    add({ id: 'combo-a11y-sms', category: 'combo', severity: 'high', penalty: 20, title: 'Screen control + SMS access', detail: 'An accessibility service can read and tap anything on screen; combined with SMS access it can complete transactions and read OTPs.' });
  } else if (accessibilityServices.length) {
    add({ id: 'a11y-service', category: 'combo', severity: 'medium', penalty: 8, title: 'Declares an accessibility service', detail: 'Legit for assistive apps; otherwise a red flag — it can read the screen and act in any app once you enable it.' });
  }
  if (has('READ_CONTACTS') && (has('READ_SMS') || has('READ_CALL_LOG')) && (has('READ_EXTERNAL_STORAGE') || has('READ_MEDIA_IMAGES') || has('CAMERA'))) {
    add({ id: 'combo-harvester', category: 'combo', severity: 'high', penalty: 22, title: 'Personal-data harvester pattern', detail: 'Contacts + messages/call history + photos. This is the exact set predatory loan apps use to pressure and harass borrowers.' });
  }
  if (has('RECORD_AUDIO') && (has('ACCESS_FINE_LOCATION') || has('ACCESS_BACKGROUND_LOCATION')) && !hasLauncher && !isTestApk) {
    add({ id: 'combo-stalker', category: 'combo', severity: 'critical', penalty: 30, title: 'Stalkerware pattern', detail: 'Microphone + precise location with no app icon to find it by. Hidden recorders work exactly like this.' });
  } else if (!hasLauncher && !isTestApk && permissions.some((p) => p.info?.severity === 'dangerous')) {
    add({ id: 'hidden-icon', category: 'combo', severity: 'medium', penalty: 6, title: 'No app icon', detail: 'It has no launcher entry, so you would not see it in your app drawer, yet it asks for sensitive permissions.' });
  }
  if (has('REQUEST_INSTALL_PACKAGES') && dynamicLoading) {
    add({ id: 'combo-dropper', category: 'combo', severity: 'high', penalty: 18, title: 'Dropper pattern', detail: 'It can load new code at runtime and install further APKs — how "clean" apps fetch their real payload after passing checks.' });
  }
  if (has('SEND_SMS') || smsSend) {
    add({ id: 'sms-send', category: 'combo', severity: has('SEND_SMS') && smsSend ? 'high' : 'medium', penalty: has('SEND_SMS') && smsSend ? 12 : 5, title: 'Can send SMS from your number', detail: 'Unless this is a messaging app, sending SMS is how premium-rate fraud charges you.' });
  }
  if (deviceAdmin) {
    add({ id: 'device-admin', category: 'combo', severity: 'high', penalty: 12, title: 'Requests device-administrator rights', detail: 'Device admins can lock or wipe your phone and block their own uninstall until deactivated.' });
  }
  if (sms && !findings.some((f) => f.id === 'combo-banker' || f.id === 'combo-a11y-sms')) {
    add({ id: 'sms-read', category: 'combo', severity: 'medium', penalty: 8, title: 'Reads your SMS', detail: 'Legit for SMS-based expense trackers and messaging apps — and exactly what OTP stealers need. Google Play only allows this for a few app types.' });
  }
  if (keyboard) {
    if (has('INTERNET')) add({ id: 'keyboard-online', category: 'combo', severity: 'medium', penalty: 8, title: 'Keyboard with internet access', detail: 'Everything you type passes through a keyboard, including passwords — and this one can send data online.' });
    else add({ id: 'keyboard-offline', category: 'combo', severity: 'good', penalty: 0, title: 'Offline keyboard', detail: 'It is a keyboard, so it sees what you type — but it has no internet permission, so it cannot send it anywhere.' });
  }
  if (vpn) {
    add({ id: 'vpn', category: 'combo', severity: 'medium', penalty: 6, title: 'VPN service', detail: 'Once enabled, all of the device’s traffic flows through this app.' });
  }
  if (notificationListener) {
    add({ id: 'notification-listener', category: 'combo', severity: sms ? 'high' : 'medium', penalty: sms ? 12 : 6, title: 'Reads all notifications', detail: 'Notification access exposes OTPs, chats and bank alerts from every app.' });
  }

  // — Permissions (capped so one category cannot dominate)
  const permPenalty = Math.min(
    26,
    permissions.reduce((s, p) => s + (p.info?.weight ?? 0), 0) * 0.55,
  );
  const dangerous = permissions.filter((p) => p.info && (p.info.severity !== 'normal') && p.info.weight >= 3);
  if (dangerous.length) {
    add({ id: 'permissions', category: 'permissions', severity: permPenalty > 16 ? 'high' : permPenalty > 7 ? 'medium' : 'low', penalty: Math.round(permPenalty), title: `${dangerous.length} sensitive permission${dangerous.length > 1 ? 's' : ''}`, detail: dangerous.slice(0, 6).map((p) => p.info!.label).join(' · ') + (dangerous.length > 6 ? ` · +${dangerous.length - 6} more` : '') });
  } else {
    add({ id: 'permissions-light', category: 'permissions', severity: 'good', penalty: 0, title: 'Light on permissions', detail: 'No sensitive permissions requested.' });
  }

  // — Trackers
  if (trackers.length) {
    const tp = Math.min(18, trackers.reduce((s, t) => s + (t.kind === 'ads' ? 4 : 3), 0));
    add({ id: 'trackers', category: 'trackers', severity: tp >= 12 ? 'medium' : 'low', penalty: tp, title: `${trackers.length} tracker${trackers.length > 1 ? 's' : ''} inside`, detail: trackers.map((t) => t.name).join(' · ') });
  } else if (dexEntries.length) {
    add({ id: 'no-trackers', category: 'trackers', severity: 'good', penalty: 0, title: 'No known trackers', detail: 'None of the analytics, ads or attribution SDKs Sentinel knows were found.' });
  }

  // — Code
  if (packers.length) add({ id: 'packer', category: 'code', severity: 'high', penalty: 15, title: `Packed with ${packers.join(', ')}`, detail: 'Packers encrypt the real code so it cannot be inspected. Some legit apps use them; so does a lot of malware.' });
  if (dexEntries.length === 0) add({ id: 'no-dex', category: 'code', severity: 'medium', penalty: 6, title: 'No readable code', detail: 'No classes.dex found — code may be hidden in native libraries or downloaded later.' });
  if (dynamicLoading && !findings.some((f) => f.id === 'combo-dropper')) add({ id: 'dynamic-code', category: 'code', severity: 'medium', penalty: 6, title: 'Loads code at runtime', detail: 'What runs later may not be what was scanned today.' });
  if (shell) add({ id: 'shell', category: 'code', severity: 'low', penalty: 3, title: 'Runs shell commands', detail: 'Uses Runtime.exec/ProcessBuilder. Common in tools; unusual in simple consumer apps.' });
  if (jsBridge) add({ id: 'js-bridge', category: 'code', severity: 'low', penalty: 2, title: 'JavaScript bridge in WebView', detail: 'Web content can call into app code. Safe only if the pages loaded are trusted.' });
  if (rootCheck || emuCheck || hookCheck) add({ id: 'anti-analysis', category: 'code', severity: 'info', penalty: 0, title: 'Environment checks', detail: 'Looks for root, emulators or hooking tools. Banking apps do this to protect you — malware does it to hide from researchers.' });

  // — Manifest
  if (flags.debuggable) add({ id: 'debuggable', category: 'manifest', severity: 'high', penalty: 14, title: 'Debug build', detail: 'android:debuggable is on — its private data can be read and its process attached to over USB. Never shipped in real releases.' });
  if (flags.testOnly) add({ id: 'test-only', category: 'manifest', severity: 'medium', penalty: 5, title: 'Marked test-only', detail: 'Test-only builds are not meant for distribution.' });
  if (flags.cleartextTraffic) add({ id: 'cleartext', category: 'manifest', severity: 'medium', penalty: 5, title: 'Allows unencrypted HTTP', detail: flags.cleartextExplicit ? 'usesCleartextTraffic is enabled — data can travel without encryption.' : 'It targets an old Android version where unencrypted HTTP is allowed by default.' });
  if (flags.allowBackup) add({ id: 'allow-backup', category: 'manifest', severity: 'low', penalty: 1, title: 'App data can be backed up', detail: 'Its data may be copied off the device via backup.' });
  if (flags.sharedUserId) add({ id: 'shared-uid', category: 'manifest', severity: 'low', penalty: 2, title: 'Shares a user ID', detail: `sharedUserId="${flags.sharedUserId}" merges its sandbox with other apps from the same signer.` });
  if (targetSdk !== null) {
    if (targetSdk < 26) add({ id: 'target-sdk', category: 'manifest', severity: 'high', penalty: 12, title: `Targets Android API ${targetSdk}`, detail: 'Very old target — it opts out of runtime-permission and background protections. Recent Android versions warn or block install.' });
    else if (targetSdk < 30) add({ id: 'target-sdk', category: 'manifest', severity: 'medium', penalty: 6, title: `Targets Android API ${targetSdk}`, detail: 'An old target skips newer privacy protections (scoped storage, package visibility).' });
    else if (targetSdk < 33) add({ id: 'target-sdk', category: 'manifest', severity: 'low', penalty: 2, title: `Targets Android API ${targetSdk}`, detail: 'Slightly behind current platform requirements.' });
  }
  if (exportedUnprotected.length) add({ id: 'exported', category: 'manifest', severity: exportedUnprotected.length > 4 ? 'medium' : 'low', penalty: Math.min(6, exportedUnprotected.length), title: `${exportedUnprotected.length} open entry point${exportedUnprotected.length > 1 ? 's' : ''}`, detail: 'Components other apps can call without any permission — extra attack surface.' });

  const { score, grade, verdict, findings: sorted } = scoreFindings(findings);
  onProgress('done');

  return {
    engine: 'sentinel@2',
    scannedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - t0),
    file: { name: fileName, size: input.length, sha256, entries: zip.entries.length },
    identity: {
      packageName,
      label,
      versionName: manifest.attrs.versionName !== undefined ? String(manifest.attrs.versionName) : null,
      versionCode: num(manifest.attrs.versionCode),
      minSdk: num(usesSdk?.attrs.minSdkVersion),
      targetSdk,
      compileSdk: num(manifest.attrs.compileSdkVersion) ?? num(manifest.attrs.platformBuildVersionCode),
    },
    icon,
    signing: {
      schemes: signing.schemes,
      verified: signing.verified,
      signers: signing.signers.map((s) => ({
        scheme: s.scheme,
        algorithm: s.algorithm,
        signatureValid: s.signatureValid,
        digestValid: s.digestValid,
        note: s.note,
        certSha256: s.certificate?.sha256 ?? null,
      })),
      cert,
      extraBlocks: signing.otherBlockIds,
    },
    permissions,
    components: {
      activities: activities.length,
      services: services.length,
      receivers: receivers.length,
      providers: providers.length,
      hasLauncher,
      exportedUnprotected,
      accessibilityServices,
      deviceAdmin,
      notificationListener,
      bootReceiver,
    },
    flags,
    code: { dexFiles: dexEntries.length, classes, methods, referencedTypes: allTypes.size, trackers, signals },
    native: { abis, libs: libNames, packers },
    composition,
    score,
    grade,
    verdict,
    findings: sorted,
  };
}

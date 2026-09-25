import { deflateSync } from 'node:zlib';
import { buildApk, encodeDex, launcherActivity, makeSigner, manifest } from './apk-builder.mjs';

/** Tiny RGBA PNG encoder for the demo launcher icon (radial ember→tide gradient). */
export function iconPng(size = 96) {
  const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const t = x / size;
      const dx = x - size / 2, dy = y - size / 2;
      const r = Math.hypot(dx, dy) / (size / 2);
      const inside = Math.abs(dx) < size * 0.42 && Math.abs(dy) < size * 0.42;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const glow = Math.max(0, 1 - r);
      raw[o] = Math.min(255, 255 * (1 - t) * 0.9 + 60 * glow);
      raw[o + 1] = Math.min(255, 107 * (1 - t) + 211 * t * 0.9 + 60 * glow);
      raw[o + 2] = Math.min(255, 44 * (1 - t) + 255 * t);
      raw[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function cleanSample(signer = makeSigner([['C', 'IN'], ['O', 'VICZO Labs'], ['CN', 'VICZO Demo Release']])) {
  return buildApk({
    signer,
    files: [
      { name: 'AndroidManifest.xml', data: manifest({
        pkg: 'com.viczo.demo.orbitnotes', versionName: '2.4.0', versionCode: 240, label: 'Orbit Notes',
        minSdk: 26, targetSdk: 35,
        permissions: ['INTERNET', 'POST_NOTIFICATIONS', 'USE_BIOMETRIC'],
        application: { allowBackup: false, usesCleartextTraffic: false },
        components: [launcherActivity('com.viczo.demo.orbitnotes.MainActivity')],
      }) },
      { name: 'classes.dex', data: encodeDex({
        classes: ['com.viczo.demo.orbitnotes.MainActivity', 'com.viczo.demo.orbitnotes.NoteStore', 'androidx.appcompat.app.AppCompatActivity', 'androidx.biometric.BiometricPrompt', 'javax.crypto.Cipher'],
        methods: ['javax.crypto.Cipher#doFinal'],
      }) },
      { name: 'res/mipmap-xxhdpi/ic_launcher.png', data: iconPng(144) },
      { name: 'assets/README.txt', data: Buffer.from('VICZO synthetic sample. Contains no executable code.\n') },
    ],
  });
}

export function riskySample(signer = makeSigner([['C', 'US'], ['O', 'Android'], ['CN', 'Android Debug']])) {
  return buildApk({
    signer,
    files: [
      { name: 'AndroidManifest.xml', data: manifest({
        pkg: 'com.secure.kyc.update', versionName: '1.0', versionCode: 1, label: 'KYC Update 2026',
        minSdk: 21, targetSdk: 28,
        permissions: ['INTERNET', 'READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'SYSTEM_ALERT_WINDOW', 'READ_CONTACTS', 'READ_CALL_LOG', 'READ_PHONE_STATE', 'REQUEST_INSTALL_PACKAGES', 'RECEIVE_BOOT_COMPLETED', 'QUERY_ALL_PACKAGES', 'READ_EXTERNAL_STORAGE'],
        application: { debuggable: true, usesCleartextTraffic: true },
        components: [
          launcherActivity('com.secure.kyc.update.Main'),
          { name: 'service', attrs: { name: 'com.secure.kyc.update.Helper', permission: 'android.permission.BIND_ACCESSIBILITY_SERVICE', exported: true } },
          { name: 'receiver', attrs: { name: 'com.secure.kyc.update.Admin', permission: 'android.permission.BIND_DEVICE_ADMIN', exported: true } },
          { name: 'receiver', attrs: { name: 'com.secure.kyc.update.Boot', exported: true }, children: [{ name: 'intent-filter', attrs: {}, children: [{ name: 'action', attrs: { name: 'android.intent.action.BOOT_COMPLETED' } }] }] },
          { name: 'receiver', attrs: { name: 'com.secure.kyc.update.SmsIn', exported: true }, children: [{ name: 'intent-filter', attrs: {}, children: [{ name: 'action', attrs: { name: 'android.provider.Telephony.SMS_RECEIVED' } }] }] },
        ],
      }) },
      { name: 'classes.dex', data: encodeDex({
        classes: ['dalvik.system.DexClassLoader', 'android.accessibilityservice.AccessibilityService', 'com.appsflyer.AppsFlyerLib', 'com.facebook.ads.AdView', 'android.content.pm.PackageInstaller'],
        methods: ['android.telephony.SmsManager#sendTextMessage', 'java.lang.Runtime#exec'],
        strings: ['/system/xbin/su', 'goldfish'],
      }) },
      { name: 'assets/README.txt', data: Buffer.from('VICZO synthetic sample. The manifest and DEX only *reference* risky APIs; there is no code to run.\n') },
    ],
  });
}

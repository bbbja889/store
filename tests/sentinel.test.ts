import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM helper shared with scripts/build-samples.mjs
import { cleanSample, riskySample } from '../scripts/lib/samples.mjs';
// @ts-expect-error — plain ESM helper
import { buildApk, encodeDex, manifest, launcherActivity } from '../scripts/lib/apk-builder.mjs';
import { analyzeApk } from '../src/sentinel/analyze';
import { parseAxml, findAll } from '../src/sentinel/axml';
import { parseDex } from '../src/sentinel/dex';
import { readZipIndex, readEntry } from '../src/sentinel/zip';

const u8 = (b: Buffer) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

describe('binary XML', () => {
  it('round-trips manifest attributes, typed values and resource-mapped names', () => {
    const xml = parseAxml(u8(manifest({ pkg: 'a.b.c', versionName: '1.2', versionCode: 12, label: 'Hi', permissions: ['CAMERA'], application: { debuggable: true }, components: [launcherActivity('a.b.c.Main')] })));
    expect(xml.name).toBe('manifest');
    expect(xml.attrs.package).toBe('a.b.c');
    expect(xml.attrs.versionCode).toBe(12);
    expect(findAll(xml, 'uses-permission')[0].attrs.name).toBe('android.permission.CAMERA');
    expect(findAll(xml, 'application')[0].attrs.debuggable).toBe(true);
    expect(findAll(xml, 'category')[0].attrs.name).toBe('android.intent.category.LAUNCHER');
  });
});

describe('DEX', () => {
  it('lists class descriptors and watched method references', () => {
    const d = parseDex(u8(encodeDex({ classes: ['com.x.Y'], methods: ['java.lang.Runtime#exec'], strings: ['/system/bin/su'] })));
    expect(d.types).toContain('com.x.Y');
    expect(d.methodRefs.has('java.lang.Runtime#exec')).toBe(true);
    expect(d.interestingStrings.has('/system/bin/su')).toBe(true);
  });
});

describe('Sentinel analysis', () => {
  it('verifies a correctly signed, clean app and rates it highly', async () => {
    const r = await analyzeApk(u8(cleanSample()), 'clean.apk');
    expect(r.identity).toMatchObject({ packageName: 'com.viczo.demo.orbitnotes', label: 'Orbit Notes', versionName: '2.4.0', targetSdk: 35 });
    expect(r.signing.schemes).toEqual(['v2']);
    expect(r.signing.verified).toBe(true);
    expect(r.signing.signers[0].digestValid).toBe(true);
    expect(r.signing.cert?.commonName).toBe('VICZO Demo Release');
    expect(r.icon?.mime).toBe('image/png');
    expect(r.code.trackers).toHaveLength(0);
    expect(r.verdict).toBe('clean');
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it('flags the banking-trojan toolkit, debug key, trackers and dropper behaviour', async () => {
    const r = await analyzeApk(u8(riskySample()), 'risky.apk');
    const ids = r.findings.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['combo-banker', 'combo-harvester', 'combo-dropper', 'debug-key', 'device-admin', 'debuggable', 'cleartext', 'trackers', 'sms-send']));
    expect(r.code.trackers.map((t) => t.id).sort()).toEqual(['appsflyer', 'facebook-ads']);
    expect(r.verdict).toBe('danger');
    expect(r.grade).toBe('F');
  });

  it('detects a single modified byte after signing', async () => {
    const apk = u8(Buffer.from(cleanSample()));
    const zip = readZipIndex(apk);
    const readme = zip.byName.get('assets/README.txt')!;
    // Flip a byte inside the stored/deflated payload of a non-critical file.
    apk[readme.localHeaderOffset + 30 + readme.name.length + 2] ^= 0xff;
    const r = await analyzeApk(apk, 'tampered.apk');
    expect(r.signing.verified).toBe(false);
    expect(r.findings[0].id).toBe('bad-signature');
    expect(r.verdict).toBe('danger');
  });

  it('reports unsigned APKs', async () => {
    const apk = u8(buildApk({ files: [
      { name: 'AndroidManifest.xml', data: manifest({ pkg: 'x.y', versionName: '1', versionCode: 1, label: 'X', components: [launcherActivity('x.y.M')] }) },
      { name: 'classes.dex', data: encodeDex({ classes: ['x.y.M'] }) },
    ] }));
    const r = await analyzeApk(apk, 'unsigned.apk');
    expect(r.signing.schemes).toEqual([]);
    expect(r.findings.map((f) => f.id)).toContain('unsigned');
    expect(readEntry(apk, readZipIndex(apk).byName.get('classes.dex')!).length).toBeGreaterThan(0);
  });

  it('rejects files that are not APKs', async () => {
    await expect(analyzeApk(new Uint8Array(100), 'nope.bin')).rejects.toThrow(/ZIP/);
  });
});

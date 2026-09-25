/**
 * Synthetic APK builder — used by unit tests and to generate the demo samples in public/samples/.
 * Produces structurally valid APKs: binary-XML manifest, a DEX with type/method references,
 * a ZIP container and a real APK Signature Scheme v2 signature. The DEX contains NO executable
 * code (no class definitions), so the samples are inert by construction.
 */
import { createHash, generateKeyPairSync, sign as nodeSign } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';

// ───────────────────────── helpers
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeUInt32LE(n % 0x100000000); b.writeUInt32LE(Math.floor(n / 0x100000000), 4); return b; };
const lp = (buf) => Buffer.concat([u32(buf.length), buf]);
const align4 = (buf) => (buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf);

// ───────────────────────── AXML encoder
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const ATTR_IDS = {
  label: 0x01010001, icon: 0x01010002, name: 0x01010003, permission: 0x01010006, debuggable: 0x0101000f,
  exported: 0x01010010, minSdkVersion: 0x0101020c, versionCode: 0x0101021b, versionName: 0x0101021c,
  targetSdkVersion: 0x01010270, allowBackup: 0x01010280, usesCleartextTraffic: 0x010104ec,
};

function stringPool(strings) {
  const data = [];
  const offsets = [];
  let off = 0;
  for (const s of strings) {
    offsets.push(off);
    const chars = Buffer.alloc(s.length * 2);
    for (let i = 0; i < s.length; i++) chars.writeUInt16LE(s.charCodeAt(i), i * 2);
    const item = Buffer.concat([u16(s.length), chars, u16(0)]);
    data.push(item);
    off += item.length;
  }
  const body = align4(Buffer.concat(data));
  const headerSize = 28;
  const stringsStart = headerSize + strings.length * 4;
  const header = Buffer.concat([u16(0x0001), u16(headerSize), u32(stringsStart + body.length), u32(strings.length), u32(0), u32(0), u32(stringsStart), u32(0)]);
  return Buffer.concat([header, ...offsets.map(u32), body]);
}

/** el: { name, attrs: { key: value } , children: [] } — keys are android:* unless they start with '_' (e.g. package). */
export function encodeAxml(root) {
  // android attribute names that have resource IDs must come first, in resource-map order.
  const mapped = Object.keys(ATTR_IDS);
  const strings = [...mapped];
  const idx = (s) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1; } return i; };
  idx(ANDROID_NS); idx('android');
  const chunks = [];
  const walk = (el) => {
    const attrs = Object.entries(el.attrs ?? {}).map(([k, v]) => {
      const plain = k.startsWith('_');
      const name = plain ? k.slice(1) : k;
      let dataType, data, raw = 0xffffffff;
      if (typeof v === 'boolean') { dataType = 0x12; data = v ? 0xffffffff : 0; }
      else if (typeof v === 'number') { dataType = 0x10; data = v; }
      else { dataType = 0x03; data = idx(String(v)); raw = data; }
      return { ns: plain ? 0xffffffff : idx(ANDROID_NS), name: idx(name), raw, dataType, data };
    });
    const ext = Buffer.concat([u32(0xffffffff), u32(idx(el.name)), u16(20), u16(20), u16(attrs.length), u16(0), u16(0), u16(0)]);
    const attrBufs = attrs.map((a) => Buffer.concat([u32(a.ns), u32(a.name), u32(a.raw), u16(8), Buffer.from([0, a.dataType]), u32(a.data)]));
    const body = Buffer.concat([ext, ...attrBufs]);
    chunks.push(Buffer.concat([u16(0x0102), u16(16), u32(16 + body.length), u32(1), u32(0xffffffff), body]));
    for (const c of el.children ?? []) walk(c);
    chunks.push(Buffer.concat([u16(0x0103), u16(16), u32(24), u32(1), u32(0xffffffff), u32(0xffffffff), u32(idx(el.name))]));
  };
  walk(root);
  const nsStart = Buffer.concat([u16(0x0100), u16(16), u32(24), u32(1), u32(0xffffffff), u32(idx('android')), u32(idx(ANDROID_NS))]);
  const nsEnd = Buffer.concat([u16(0x0101), u16(16), u32(24), u32(1), u32(0xffffffff), u32(idx('android')), u32(idx(ANDROID_NS))]);
  const pool = stringPool(strings);
  const resMapBody = Buffer.concat(mapped.map((k) => u32(ATTR_IDS[k])));
  const resMap = Buffer.concat([u16(0x0180), u16(8), u32(8 + resMapBody.length), resMapBody]);
  const body = Buffer.concat([pool, resMap, nsStart, ...chunks, nsEnd]);
  return Buffer.concat([u16(0x0003), u16(8), u32(8 + body.length), body]);
}

// ───────────────────────── DEX writer (types + method refs only, no code)
function uleb(n) { const out = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n); return Buffer.from(out); }

export function encodeDex({ classes = [], methods = [], strings: extra = [] }) {
  const descriptor = (c) => `L${c.replace(/\./g, '/')};`;
  const methodNames = methods.map((m) => m.split('#')[1]);
  const methodClasses = methods.map((m) => m.split('#')[0]);
  const typeList = [...new Set([...classes, ...methodClasses])];
  const strings = [...new Set([...typeList.map(descriptor), ...methodNames, ...extra])].sort();
  const sIdx = (s) => strings.indexOf(s);
  const header = 0x70;
  const stringIdsOff = header;
  const typeIdsOff = stringIdsOff + strings.length * 4;
  const methodIdsOff = typeIdsOff + typeList.length * 4;
  let dataOff = methodIdsOff + methods.length * 8;
  const stringData = [];
  const stringOffsets = [];
  for (const s of strings) {
    stringOffsets.push(dataOff);
    const item = Buffer.concat([uleb(s.length), Buffer.from(s, 'utf8'), Buffer.from([0])]);
    stringData.push(item);
    dataOff += item.length;
  }
  const h = Buffer.alloc(header);
  h.write('dex\n035\0', 0, 'latin1');
  h.writeUInt32LE(header, 0x24); // header_size
  h.writeUInt32LE(0x12345678, 0x28); // endian tag
  h.writeUInt32LE(strings.length, 0x38); h.writeUInt32LE(stringIdsOff, 0x3c);
  h.writeUInt32LE(typeList.length, 0x40); h.writeUInt32LE(typeIdsOff, 0x44);
  h.writeUInt32LE(methods.length, 0x58); h.writeUInt32LE(methodIdsOff, 0x5c);
  h.writeUInt32LE(0, 0x60); // class_defs_size — no code at all
  const typeIds = typeList.map((t) => u32(sIdx(descriptor(t))));
  const methodIds = methods.map((m, i) => Buffer.concat([u16(typeList.indexOf(methodClasses[i])), u16(0), u32(sIdx(methodNames[i]))]));
  const out = Buffer.concat([h, ...stringOffsets.map(u32), ...typeIds, ...methodIds, ...stringData]);
  out.writeUInt32LE(out.length, 0x20); // file_size
  return out;
}

// ───────────────────────── ZIP writer
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function buildZip(files) {
  const locals = [];
  const central = [];
  let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const deflate = f.name !== 'resources.arsc' && !/\.(png|webp)$/.test(f.name);
    const data = deflate ? deflateRawSync(f.data) : f.data;
    const crc = crc32(f.data);
    const method = deflate ? 8 : 0;
    const lh = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(method), u16(0), u16(0x21), u32(crc), u32(data.length), u32(f.data.length), u16(name.length), u16(0), name]);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(method), u16(0), u16(0x21), u32(crc), u32(data.length), u32(f.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), name]));
    locals.push(lh, data);
    off += lh.length + data.length;
  }
  const entries = Buffer.concat(locals);
  const cd = Buffer.concat(central);
  const eocd = (cdOffset) => Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(cdOffset), u16(0)]);
  return { entries, cd, eocd };
}

// ───────────────────────── X.509 (minimal self-signed cert DER)
function der(tag, content) {
  const len = content.length;
  let l;
  if (len < 0x80) l = Buffer.from([len]);
  else if (len < 0x100) l = Buffer.from([0x81, len]);
  else if (len < 0x10000) l = Buffer.from([0x82, len >> 8, len & 0xff]);
  else l = Buffer.from([0x83, len >> 16, (len >> 8) & 0xff, len & 0xff]);
  return Buffer.concat([Buffer.from([tag]), l, content]);
}
const seq = (...c) => der(0x30, Buffer.concat(c));
const set = (...c) => der(0x31, Buffer.concat(c));
function oid(s) {
  const p = s.split('.').map(Number);
  const out = [40 * p[0] + p[1]];
  for (const n of p.slice(2)) { const stack = [n & 0x7f]; let v = n >>> 7; while (v) { stack.unshift((v & 0x7f) | 0x80); v >>>= 7; } out.push(...stack); }
  return der(0x06, Buffer.from(out));
}
const utf8s = (s) => der(0x0c, Buffer.from(s, 'utf8'));
const printable = (s) => der(0x13, Buffer.from(s, 'latin1'));
function name(parts) {
  const map = { C: '2.5.4.6', O: '2.5.4.10', OU: '2.5.4.11', CN: '2.5.4.3' };
  return seq(...parts.map(([k, v]) => set(seq(oid(map[k]), k === 'C' ? printable(v) : utf8s(v)))));
}
const utcTime = (d) => der(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z', 'latin1'));

export function makeSigner(subject) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const sha256Rsa = seq(oid('1.2.840.113549.1.1.11'), der(0x05, Buffer.alloc(0)));
  const now = new Date(Date.UTC(2026, 0, 1));
  const later = new Date(Date.UTC(2049, 0, 1));
  const tbs = seq(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, Buffer.from([0x01, 0x23, 0x45, 0x67])),
    sha256Rsa,
    name(subject),
    seq(utcTime(now), utcTime(later)),
    name(subject),
    spki,
  );
  const signature = nodeSign('sha256', tbs, privateKey);
  const cert = seq(tbs, sha256Rsa, der(0x03, Buffer.concat([Buffer.from([0]), signature])));
  return { cert, spki, privateKey };
}

// ───────────────────────── v2 signing
function chunkedDigest(sections) {
  const digests = [];
  for (const s of sections) {
    for (let o = 0; o < s.length; o += 1048576) {
      const c = s.subarray(o, Math.min(o + 1048576, s.length));
      digests.push(createHash('sha256').update(Buffer.concat([Buffer.from([0xa5]), u32(c.length), c])).digest());
    }
  }
  return createHash('sha256').update(Buffer.concat([Buffer.from([0x5a]), u32(digests.length), ...digests])).digest();
}

export function buildApk({ files, signer }) {
  const { entries, cd, eocd } = buildZip(files);
  if (!signer) return Buffer.concat([entries, cd, eocd(entries.length)]);
  const blockStart = entries.length;
  const digest = chunkedDigest([entries, cd, eocd(blockStart)]);
  const ALG = 0x0103; // RSASSA-PKCS1-v1_5 with SHA-256
  const signedData = Buffer.concat([lp(lp(Buffer.concat([u32(ALG), lp(digest)]))), lp(lp(signer.cert)), lp(Buffer.alloc(0))]);
  const sig = nodeSign('sha256', signedData, signer.privateKey);
  const signerBuf = Buffer.concat([lp(signedData), lp(lp(Buffer.concat([u32(ALG), lp(sig)]))), lp(signer.spki)]);
  const v2 = lp(lp(signerBuf));
  const pair = Buffer.concat([u64(v2.length + 4), u32(0x7109871a), v2]);
  const size = pair.length + 8 + 16; // pairs + footer size + magic (excludes the leading size field)
  const block = Buffer.concat([u64(size), pair, u64(size), Buffer.from('APK Sig Block 42', 'latin1')]);
  return Buffer.concat([entries, block, cd, eocd(blockStart + block.length)]);
}

// ───────────────────────── presets
export function manifest({ pkg, versionName, versionCode, label, minSdk = 26, targetSdk = 35, permissions = [], application = {}, components = [] }) {
  return encodeAxml({
    name: 'manifest',
    attrs: { versionCode, versionName, _package: pkg },
    children: [
      { name: 'uses-sdk', attrs: { minSdkVersion: minSdk, targetSdkVersion: targetSdk } },
      ...permissions.map((p) => ({ name: 'uses-permission', attrs: { name: p.includes('.') ? p : `android.permission.${p}` } })),
      { name: 'application', attrs: { label, ...application }, children: components },
    ],
  });
}

export const launcherActivity = (cls) => ({
  name: 'activity',
  attrs: { name: cls, exported: true },
  children: [{ name: 'intent-filter', attrs: {}, children: [
    { name: 'action', attrs: { name: 'android.intent.action.MAIN' } },
    { name: 'category', attrs: { name: 'android.intent.category.LAUNCHER' } },
  ] }],
});

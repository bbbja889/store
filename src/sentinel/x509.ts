/** Tiny DER/ASN.1 reader and X.509 certificate summariser. */
import { ParseError, sha, toHex } from './bytes';

export interface Asn1 {
  tag: number;
  /** Offset of the tag byte within the source buffer. */
  start: number;
  headerLen: number;
  len: number;
  /** Content bytes. */
  value: Uint8Array;
  /** Full TLV bytes. */
  raw: Uint8Array;
  children?: Asn1[];
}

export function readAsn1(buf: Uint8Array, start = 0, end = buf.length): Asn1 {
  if (start + 2 > end) throw new ParseError('ASN.1 truncated');
  const tag = buf[start];
  let p = start + 1;
  let len = buf[p++];
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new ParseError('ASN.1 length form unsupported');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[p++];
  }
  const headerLen = p - start;
  if (p + len > end) throw new ParseError('ASN.1 length overflow');
  const node: Asn1 = {
    tag,
    start,
    headerLen,
    len,
    value: buf.subarray(p, p + len),
    raw: buf.subarray(start, p + len),
  };
  const constructed = (tag & 0x20) !== 0;
  if (constructed) {
    node.children = [];
    let q = p;
    while (q < p + len) {
      const c = readAsn1(buf, q, p + len);
      node.children.push(c);
      q = c.start + c.headerLen + c.len;
    }
  }
  return node;
}

export function oidToString(bytes: Uint8Array): string {
  const parts: number[] = [];
  const first = bytes[0];
  parts.push(Math.floor(first / 40), first % 40);
  let v = 0;
  for (let i = 1; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) {
      parts.push(v);
      v = 0;
    }
  }
  return parts.join('.');
}

const NAME_OIDS: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '1.2.840.113549.1.9.1': 'E',
};

const SIG_ALGS: Record<string, string> = {
  '1.2.840.113549.1.1.4': 'MD5 with RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.113549.1.1.10': 'RSA-PSS',
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
  '1.2.840.10040.4.3': 'DSA with SHA-1',
  '2.16.840.1.101.3.4.3.2': 'DSA with SHA-256',
};

const CURVES: Record<string, string> = {
  '1.2.840.10045.3.1.7': 'P-256',
  '1.3.132.0.34': 'P-384',
  '1.3.132.0.35': 'P-521',
};

export interface CertInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  subjectText: string;
  issuerText: string;
  serial: string;
  notBefore: string | null;
  notAfter: string | null;
  signatureAlgorithm: string;
  keyAlgorithm: 'RSA' | 'EC' | 'DSA' | 'unknown';
  keyBits: number | null;
  curve: string | null;
  sha256: string;
  sha1: string;
  selfSigned: boolean;
  /** SubjectPublicKeyInfo DER — used to verify APK signatures. */
  spki: Uint8Array;
}

const dec = new TextDecoder('utf-8', { fatal: false });

function readName(node: Asn1): Record<string, string> {
  const out: Record<string, string> = {};
  for (const set of node.children ?? []) {
    for (const atv of set.children ?? []) {
      const [oid, val] = atv.children ?? [];
      if (!oid || !val) continue;
      const key = NAME_OIDS[oidToString(oid.value)] ?? oidToString(oid.value);
      out[key] = val.tag === 0x1e ? utf16be(val.value) : dec.decode(val.value);
    }
  }
  return out;
}

function utf16be(b: Uint8Array) {
  let s = '';
  for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  return s;
}

function nameText(n: Record<string, string>) {
  return ['CN', 'OU', 'O', 'L', 'ST', 'C', 'E']
    .filter((k) => n[k])
    .map((k) => `${k}=${n[k]}`)
    .join(', ');
}

function readTime(node: Asn1 | undefined): string | null {
  if (!node) return null;
  const s = dec.decode(node.value);
  let y: number, rest: string;
  if (node.tag === 0x17) {
    const yy = parseInt(s.slice(0, 2), 10);
    y = yy >= 50 ? 1900 + yy : 2000 + yy;
    rest = s.slice(2);
  } else {
    y = parseInt(s.slice(0, 4), 10);
    rest = s.slice(4);
  }
  const mo = rest.slice(0, 2);
  const d = rest.slice(2, 4);
  const h = rest.slice(4, 6) || '00';
  const mi = rest.slice(6, 8) || '00';
  const se = rest.slice(8, 10) || '00';
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export async function parseCertificate(der: Uint8Array): Promise<CertInfo> {
  const cert = readAsn1(der);
  const tbs = cert.children?.[0];
  if (!tbs?.children) throw new ParseError('Bad certificate');
  let i = 0;
  if (tbs.children[0].tag === 0xa0) i++; // explicit version
  const serial = tbs.children[i++];
  const sigAlg = tbs.children[i++];
  const issuer = tbs.children[i++];
  const validity = tbs.children[i++];
  const subject = tbs.children[i++];
  const spki = tbs.children[i++];

  const sigOid = oidToString(sigAlg.children?.[0]?.value ?? new Uint8Array());
  const keyAlgNode = spki.children?.[0];
  const keyOid = oidToString(keyAlgNode?.children?.[0]?.value ?? new Uint8Array());
  let keyAlgorithm: CertInfo['keyAlgorithm'] = 'unknown';
  let keyBits: number | null = null;
  let curve: string | null = null;
  const bitString = spki.children?.[1];
  if (keyOid === '1.2.840.113549.1.1.1' && bitString) {
    keyAlgorithm = 'RSA';
    try {
      const rsa = readAsn1(bitString.value, 1);
      const mod = rsa.children?.[0]?.value;
      if (mod) {
        let k = 0;
        while (k < mod.length && mod[k] === 0) k++;
        keyBits = (mod.length - k) * 8 - Math.clz32(mod[k]) + 24;
      }
    } catch {
      /* ignore */
    }
  } else if (keyOid === '1.2.840.10045.2.1') {
    keyAlgorithm = 'EC';
    const c = keyAlgNode?.children?.[1];
    curve = c ? CURVES[oidToString(c.value)] ?? oidToString(c.value) : null;
    keyBits = curve === 'P-256' ? 256 : curve === 'P-384' ? 384 : curve === 'P-521' ? 521 : null;
  } else if (keyOid === '1.2.840.10040.4.1') {
    keyAlgorithm = 'DSA';
  }

  const subj = readName(subject);
  const iss = readName(issuer);
  const [h256, h1] = await Promise.all([sha('SHA-256', der), sha('SHA-1', der)]);
  return {
    subject: subj,
    issuer: iss,
    subjectText: nameText(subj),
    issuerText: nameText(iss),
    serial: toHex(serial.value),
    notBefore: readTime(validity.children?.[0]),
    notAfter: readTime(validity.children?.[1]),
    signatureAlgorithm: SIG_ALGS[sigOid] ?? sigOid,
    keyAlgorithm,
    keyBits,
    curve,
    sha256: toHex(h256),
    sha1: toHex(h1),
    selfSigned: nameText(subj) === nameText(iss),
    spki: spki.raw,
  };
}

/** Extracts X.509 certificates from a PKCS#7 SignedData blob (v1 JAR signature *.RSA/*.DSA/*.EC). */
export function certificatesFromPkcs7(der: Uint8Array): Uint8Array[] {
  const ci = readAsn1(der);
  const content = ci.children?.[1]?.children?.[0]; // [0] EXPLICIT → SignedData
  const certsNode = content?.children?.find((c) => c.tag === 0xa0);
  return (certsNode?.children ?? []).map((c) => c.raw);
}

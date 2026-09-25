/**
 * APK signature analysis:
 *  - APK Signing Block (v2 / v3 / v3.1) discovery and parsing
 *  - cryptographic verification with WebCrypto (signature over signed-data + chunked content digest)
 *  - v1 (JAR) certificate extraction from META-INF/*.RSA|DSA|EC
 * Reference: https://source.android.com/docs/security/features/apksigning/v2
 */
import { ascii, concat, sha, slice, toHex, u32, u64, view } from './bytes';
import type { ZipIndex } from './zip';
import { readEntry } from './zip';
import { certificatesFromPkcs7, parseCertificate, readAsn1, type CertInfo } from './x509';

export const BLOCK_V2 = 0x7109871a;
export const BLOCK_V3 = 0xf05368c0;
export const BLOCK_V31 = 0x1b93ad61;
const MAGIC = 'APK Sig Block 42';

export type SchemeId = 'v1' | 'v2' | 'v3' | 'v3.1';

export interface AlgorithmInfo {
  id: number;
  name: string;
  digest: 'SHA-256' | 'SHA-512' | null;
  kind: 'RSA-PKCS1' | 'RSA-PSS' | 'ECDSA' | 'DSA';
  verity: boolean;
}

export const ALGORITHMS: Record<number, AlgorithmInfo> = {
  0x0101: { id: 0x0101, name: 'RSASSA-PSS / SHA-256', digest: 'SHA-256', kind: 'RSA-PSS', verity: false },
  0x0102: { id: 0x0102, name: 'RSASSA-PSS / SHA-512', digest: 'SHA-512', kind: 'RSA-PSS', verity: false },
  0x0103: { id: 0x0103, name: 'RSASSA-PKCS1-v1_5 / SHA-256', digest: 'SHA-256', kind: 'RSA-PKCS1', verity: false },
  0x0104: { id: 0x0104, name: 'RSASSA-PKCS1-v1_5 / SHA-512', digest: 'SHA-512', kind: 'RSA-PKCS1', verity: false },
  0x0201: { id: 0x0201, name: 'ECDSA / SHA-256', digest: 'SHA-256', kind: 'ECDSA', verity: false },
  0x0202: { id: 0x0202, name: 'ECDSA / SHA-512', digest: 'SHA-512', kind: 'ECDSA', verity: false },
  0x0301: { id: 0x0301, name: 'DSA / SHA-256', digest: 'SHA-256', kind: 'DSA', verity: false },
  0x0421: { id: 0x0421, name: 'RSASSA-PKCS1-v1_5 / SHA-256 (verity)', digest: null, kind: 'RSA-PKCS1', verity: true },
  0x0422: { id: 0x0422, name: 'ECDSA / SHA-256 (verity)', digest: null, kind: 'ECDSA', verity: true },
  0x0423: { id: 0x0423, name: 'DSA / SHA-256 (verity)', digest: null, kind: 'DSA', verity: true },
};

export interface SignerResult {
  scheme: SchemeId;
  certificate: CertInfo | null;
  algorithm: string | null;
  /** true = cryptographically verified, false = verification FAILED, null = could not check. */
  signatureValid: boolean | null;
  digestValid: boolean | null;
  note?: string;
}

export interface SigningReport {
  schemes: SchemeId[];
  signers: SignerResult[];
  /** Overall: true only if every checked scheme verified; false if any failed. */
  verified: boolean | null;
  primaryCert: CertInfo | null;
  hasSigningBlock: boolean;
  otherBlockIds: string[];
}

interface Lp {
  data: Uint8Array;
  next: number;
}

function lp(buf: Uint8Array, off: number, end: number): Lp {
  const len = u32(view(buf), off);
  const start = off + 4;
  if (start + len > end) throw new Error('length-prefixed value overflows');
  return { data: buf.subarray(start, start + len), next: start + len };
}

function lpSeq(buf: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let p = 0;
  while (p + 4 <= buf.length) {
    const v = lp(buf, p, buf.length);
    out.push(v.data);
    p = v.next;
  }
  return out;
}

export interface SigningBlock {
  start: number;
  pairs: Map<number, Uint8Array>;
}

export function findSigningBlock(buf: Uint8Array, zip: ZipIndex): SigningBlock | null {
  const cd = zip.cdOffset;
  if (cd < 32) return null;
  const magic = ascii(buf.subarray(cd - 16, cd));
  if (magic !== MAGIC) return null;
  const dv = view(buf);
  const sizeInFooter = u64(dv, cd - 24);
  const start = cd - sizeInFooter - 8;
  if (start < 0 || u64(dv, start) !== sizeInFooter) return null;
  const pairs = new Map<number, Uint8Array>();
  let p = start + 8;
  const end = cd - 24;
  while (p + 12 <= end) {
    const len = u64(dv, p);
    if (len < 4 || p + 8 + len > end) break;
    const id = u32(dv, p + 8);
    pairs.set(id >>> 0, buf.subarray(p + 12, p + 8 + len));
    p += 8 + len;
  }
  return { start, pairs };
}

/** DER-encoded ECDSA signature → IEEE P1363 r||s, as WebCrypto expects. */
function ecdsaDerToRaw(der: Uint8Array, size: number): Uint8Array {
  const seq = readAsn1(der);
  const [r, s] = seq.children ?? [];
  const fix = (v: Uint8Array) => {
    let x = v;
    while (x.length > size && x[0] === 0) x = x.subarray(1);
    const out = new Uint8Array(size);
    out.set(x, size - x.length);
    return out;
  };
  return concat([fix(r.value), fix(s.value)]);
}

async function verifySignature(alg: AlgorithmInfo, spki: Uint8Array, signature: Uint8Array, data: Uint8Array): Promise<boolean | null> {
  const hash = alg.digest ?? 'SHA-256';
  try {
    if (alg.kind === 'RSA-PKCS1') {
      const key = await crypto.subtle.importKey('spki', spki as BufferSource, { name: 'RSASSA-PKCS1-v1_5', hash }, false, ['verify']);
      return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature as BufferSource, data as BufferSource);
    }
    if (alg.kind === 'RSA-PSS') {
      const key = await crypto.subtle.importKey('spki', spki as BufferSource, { name: 'RSA-PSS', hash }, false, ['verify']);
      return await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: hash === 'SHA-256' ? 32 : 64 }, key, signature as BufferSource, data as BufferSource);
    }
    if (alg.kind === 'ECDSA') {
      const key = await crypto.subtle.importKey('spki', spki as BufferSource, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return await crypto.subtle.verify({ name: 'ECDSA', hash }, key, ecdsaDerToRaw(signature, 32) as BufferSource, data as BufferSource);
    }
  } catch {
    return null;
  }
  return null; // DSA is not supported by WebCrypto
}

const CHUNK = 1024 * 1024;

/** The v2/v3 "chunked" content digest over [entries | central directory | EOCD(with patched CD offset)]. */
export async function contentDigest(buf: Uint8Array, zip: ZipIndex, blockStart: number, digest: 'SHA-256' | 'SHA-512'): Promise<Uint8Array> {
  const eocd = buf.slice(zip.eocdOffset);
  new DataView(eocd.buffer).setUint32(16, blockStart, true);
  const sections = [slice(buf, 0, blockStart), slice(buf, zip.cdOffset, zip.eocdOffset), eocd];
  const digests: Uint8Array[] = [];
  const prefix = new Uint8Array(5);
  const pdv = new DataView(prefix.buffer);
  prefix[0] = 0xa5;
  for (const sec of sections) {
    for (let o = 0; o < sec.length; o += CHUNK) {
      const chunk = sec.subarray(o, Math.min(o + CHUNK, sec.length));
      pdv.setUint32(1, chunk.length, true);
      digests.push(await sha(digest, concat([prefix, chunk])));
    }
  }
  const head = new Uint8Array(5);
  head[0] = 0x5a;
  new DataView(head.buffer).setUint32(1, digests.length, true);
  return sha(digest, concat([head, ...digests]));
}

async function analyseBlockScheme(
  buf: Uint8Array,
  zip: ZipIndex,
  block: SigningBlock,
  value: Uint8Array,
  scheme: SchemeId,
  digestCache: Map<string, Promise<Uint8Array>>,
): Promise<SignerResult[]> {
  const results: SignerResult[] = [];
  const signers = lpSeq(lp(value, 0, value.length).data);
  for (const signer of signers) {
    try {
      const signedData = lp(signer, 0, signer.length);
      let p = signedData.next;
      if (scheme !== 'v2') p += 8; // minSdk + maxSdk
      const signatures = lp(signer, p, signer.length);
      const publicKey = lp(signer, signatures.next, signer.length).data;

      const sd = signedData.data;
      const digestsSeq = lp(sd, 0, sd.length);
      const certsSeq = lp(sd, digestsSeq.next, sd.length);
      const certs = lpSeq(certsSeq.data);
      const certificate = certs[0] ? await parseCertificate(certs[0]) : null;

      const sigEntries = lpSeq(signatures.data).map((e) => ({ alg: u32(view(e), 0), sig: lp(e, 4, e.length).data }));
      const digestEntries = lpSeq(digestsSeq.data).map((e) => ({ alg: u32(view(e), 0), digest: lp(e, 4, e.length).data }));

      // Prefer the strongest non-verity algorithm we can check.
      const order = [0x0104, 0x0103, 0x0102, 0x0101, 0x0202, 0x0201, 0x0421, 0x0422, 0x0301, 0x0423];
      const chosen = order.map((id) => sigEntries.find((s) => s.alg === id)).find(Boolean) ?? sigEntries[0];
      const alg = chosen ? ALGORITHMS[chosen.alg] : undefined;
      let signatureValid: boolean | null = null;
      let digestValid: boolean | null = null;
      let note: string | undefined;
      if (chosen && alg) {
        signatureValid = await verifySignature(alg, publicKey, chosen.sig, sd);
        if (certificate && toHex(certificate.spki) !== toHex(publicKey)) {
          signatureValid = false;
          note = 'Public key does not match the signing certificate';
        }
        if (signatureValid && alg.digest) {
          const expected = digestEntries.find((d) => d.alg === chosen.alg)?.digest;
          const key = `${alg.digest}`;
          if (!digestCache.has(key)) digestCache.set(key, contentDigest(buf, zip, block.start, alg.digest));
          const actual = await digestCache.get(key)!;
          digestValid = expected ? toHex(expected) === toHex(actual) : null;
          if (digestValid === false) note = 'APK contents were modified after signing';
        } else if (alg.verity) {
          note = 'Verity digest not recomputed in-browser; signature over signed data checked';
        }
        if (signatureValid === null) note = note ?? `${alg.name} cannot be verified in the browser`;
      }
      results.push({ scheme, certificate, algorithm: alg?.name ?? null, signatureValid, digestValid, note });
    } catch (e) {
      results.push({ scheme, certificate: null, algorithm: null, signatureValid: false, digestValid: null, note: `Malformed ${scheme} signer: ${(e as Error).message}` });
    }
  }
  return results;
}

export async function analyseSigning(buf: Uint8Array, zip: ZipIndex): Promise<SigningReport> {
  const signers: SignerResult[] = [];
  const schemes: SchemeId[] = [];
  const block = findSigningBlock(buf, zip);
  const otherBlockIds: string[] = [];
  const digestCache = new Map<string, Promise<Uint8Array>>();

  if (block) {
    const known: [number, SchemeId][] = [
      [BLOCK_V2, 'v2'],
      [BLOCK_V3, 'v3'],
      [BLOCK_V31, 'v3.1'],
    ];
    for (const [id, scheme] of known) {
      const v = block.pairs.get(id);
      if (!v) continue;
      schemes.push(scheme);
      signers.push(...(await analyseBlockScheme(buf, zip, block, v, scheme, digestCache)));
    }
    for (const id of block.pairs.keys()) {
      if (id !== BLOCK_V2 && id !== BLOCK_V3 && id !== BLOCK_V31) otherBlockIds.push(`0x${id.toString(16).padStart(8, '0')}`);
    }
  }

  const v1 = zip.entries.find((e) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(e.name));
  if (v1) {
    schemes.unshift('v1');
    try {
      const certs = certificatesFromPkcs7(readEntry(buf, v1));
      const certificate = certs[0] ? await parseCertificate(certs[0]) : null;
      signers.push({ scheme: 'v1', certificate, algorithm: null, signatureValid: null, digestValid: null, note: 'JAR signature present (not re-verified in-browser)' });
    } catch (e) {
      signers.push({ scheme: 'v1', certificate: null, algorithm: null, signatureValid: false, digestValid: null, note: `Unreadable v1 signature: ${(e as Error).message}` });
    }
  }

  const checked = signers.filter((s) => s.signatureValid !== null || s.digestValid !== null);
  const failed = signers.some((s) => s.signatureValid === false || s.digestValid === false);
  const verified = failed ? false : checked.some((s) => s.signatureValid === true) ? true : null;
  const primary =
    signers.find((s) => s.scheme === 'v3.1' && s.certificate) ??
    signers.find((s) => s.scheme === 'v3' && s.certificate) ??
    signers.find((s) => s.scheme === 'v2' && s.certificate) ??
    signers.find((s) => s.certificate);

  return {
    schemes,
    signers,
    verified,
    primaryCert: primary?.certificate ?? null,
    hasSigningBlock: !!block,
    otherBlockIds,
  };
}

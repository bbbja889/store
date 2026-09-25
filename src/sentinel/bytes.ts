/** Little-endian binary helpers shared by the ZIP, AXML, ARSC, DEX and signing parsers. */

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export function view(buf: Uint8Array): DataView {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function u16(dv: DataView, off: number): number {
  if (off < 0 || off + 2 > dv.byteLength) throw new ParseError(`u16 out of bounds @${off}`);
  return dv.getUint16(off, true);
}

export function u32(dv: DataView, off: number): number {
  if (off < 0 || off + 4 > dv.byteLength) throw new ParseError(`u32 out of bounds @${off}`);
  return dv.getUint32(off, true);
}

/** Reads a u64 as a JS number (APK sizes are far below 2^53). */
export function u64(dv: DataView, off: number): number {
  const lo = u32(dv, off);
  const hi = u32(dv, off + 4);
  return hi * 0x1_0000_0000 + lo;
}

export function slice(buf: Uint8Array, start: number, end: number): Uint8Array {
  if (start < 0 || end > buf.byteLength || start > end) throw new ParseError(`slice out of bounds ${start}..${end}`);
  return buf.subarray(start, end);
}

export function toHex(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

export function colonHex(hex: string): string {
  return hex.toUpperCase().match(/.{1,2}/g)?.join(':') ?? '';
}

export function ascii(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

export function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  const first = needle[0];
  const max = hay.length - needle.length;
  outer: for (let i = from; i <= max; i++) {
    if (hay[i] !== first) continue;
    for (let j = 1; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export async function sha(algo: 'SHA-256' | 'SHA-512' | 'SHA-1', data: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const input = data instanceof Uint8Array ? data : new Uint8Array(data);
  const d = await crypto.subtle.digest(algo, input as BufferSource);
  return new Uint8Array(d);
}

export function concat(parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

import { inflateSync } from 'fflate';
import { ParseError, slice, u16, u32, view } from './bytes';

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localHeaderOffset: number;
  crc32: number;
}

export interface ZipIndex {
  entries: ZipEntry[];
  byName: Map<string, ZipEntry>;
  /** Offset of the End Of Central Directory record. */
  eocdOffset: number;
  /** Offset where the central directory starts. */
  cdOffset: number;
  cdSize: number;
}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

export function findEocd(buf: Uint8Array): number {
  const dv = view(buf);
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === EOCD_SIG) {
      // Comment length must reach exactly the end of file for a real EOCD.
      const commentLen = dv.getUint16(i + 20, true);
      if (i + 22 + commentLen === buf.length) return i;
    }
  }
  throw new ParseError('Not a ZIP/APK file (no end-of-central-directory record)');
}

const utf8 = new TextDecoder('utf-8');

export function readZipIndex(buf: Uint8Array): ZipIndex {
  const dv = view(buf);
  const eocdOffset = findEocd(buf);
  const count = u16(dv, eocdOffset + 10);
  const cdSize = u32(dv, eocdOffset + 12);
  const cdOffset = u32(dv, eocdOffset + 16);
  if (cdOffset + cdSize > eocdOffset) throw new ParseError('Central directory overlaps EOCD');

  const entries: ZipEntry[] = [];
  const byName = new Map<string, ZipEntry>();
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (u32(dv, p) !== CD_SIG) throw new ParseError(`Bad central directory entry #${i}`);
    const method = u16(dv, p + 10);
    const crc32 = u32(dv, p + 16);
    const compressedSize = u32(dv, p + 20);
    const size = u32(dv, p + 24);
    const nameLen = u16(dv, p + 28);
    const extraLen = u16(dv, p + 30);
    const commentLen = u16(dv, p + 32);
    const localHeaderOffset = u32(dv, p + 42);
    const name = utf8.decode(slice(buf, p + 46, p + 46 + nameLen));
    const entry: ZipEntry = { name, method, compressedSize, size, localHeaderOffset, crc32 };
    entries.push(entry);
    // First entry wins, matching Android's installer behaviour for duplicate names.
    if (!byName.has(name)) byName.set(name, entry);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, byName, eocdOffset, cdOffset, cdSize };
}

export function readEntry(buf: Uint8Array, entry: ZipEntry): Uint8Array {
  const dv = view(buf);
  const lh = entry.localHeaderOffset;
  if (u32(dv, lh) !== LOCAL_SIG) throw new ParseError(`Bad local header for ${entry.name}`);
  const nameLen = u16(dv, lh + 26);
  const extraLen = u16(dv, lh + 28);
  const start = lh + 30 + nameLen + extraLen;
  const data = slice(buf, start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateSync(data, { out: new Uint8Array(entry.size) });
  throw new ParseError(`Unsupported compression method ${entry.method} for ${entry.name}`);
}

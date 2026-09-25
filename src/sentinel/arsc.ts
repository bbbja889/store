/**
 * Minimal resources.arsc reader: resolves resource IDs (e.g. @string/app_name, @mipmap/ic_launcher)
 * to values across configurations. Best effort — returns undefined on anything unusual.
 */
import { u16, u32, view } from './bytes';
import { readStringPool } from './axml';

interface ResEntryValue {
  dataType: number;
  data: number;
  language: string;
  density: number;
}

export interface ResourceTable {
  resolve(id: number): ResEntryValue[];
  strings: string[];
}

const RES_TABLE_TYPE = 0x0002;
const RES_STRING_POOL_TYPE = 0x0001;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;
const FLAG_SPARSE = 0x01;
const FLAG_OFFSET16 = 0x02;
const ENTRY_FLAG_COMPLEX = 0x0001;
const ENTRY_FLAG_COMPACT = 0x0008;

export function parseArsc(buf: Uint8Array): ResourceTable | undefined {
  const dv = view(buf);
  if (buf.length < 12 || u16(dv, 0) !== RES_TABLE_TYPE) return undefined;
  let globalStrings: string[] = [];
  // key: (pkg<<24)|(type<<16)|entry
  const table = new Map<number, ResEntryValue[]>();

  let p = u16(dv, 2);
  const end = Math.min(u32(dv, 4), buf.length);
  while (p + 8 <= end) {
    const type = u16(dv, p);
    const headerSize = u16(dv, p + 2);
    const size = u32(dv, p + 4);
    if (size < 8 || p + size > buf.length) break;
    if (type === RES_STRING_POOL_TYPE) {
      globalStrings = readStringPool(buf, p);
    } else if (type === RES_TABLE_PACKAGE_TYPE) {
      const pkgId = u32(dv, p + 8) & 0xff;
      let q = p + headerSize;
      const pkgEnd = p + size;
      while (q + 8 <= pkgEnd) {
        const ctype = u16(dv, q);
        const chs = u16(dv, q + 2);
        const csize = u32(dv, q + 4);
        if (csize < 8 || q + csize > pkgEnd) break;
        if (ctype === RES_TABLE_TYPE_TYPE) {
          try {
            readTypeChunk(buf, dv, q, chs, pkgId, table);
          } catch {
            /* skip malformed chunk */
          }
        }
        q += csize;
      }
    }
    p += size;
  }

  return {
    strings: globalStrings,
    resolve(id: number) {
      return table.get(id >>> 0) ?? [];
    },
  };
}

function readTypeChunk(
  buf: Uint8Array,
  dv: DataView,
  q: number,
  headerSize: number,
  pkgId: number,
  table: Map<number, ResEntryValue[]>,
) {
  const typeId = dv.getUint8(q + 8);
  const flags = dv.getUint8(q + 9);
  const entryCount = u32(dv, q + 12);
  const entriesStart = u32(dv, q + 16);
  const config = q + 20;
  const lang0 = dv.getUint8(config + 8);
  const lang1 = dv.getUint8(config + 9);
  const language = lang0 ? String.fromCharCode(lang0) + String.fromCharCode(lang1) : '';
  const density = u16(dv, config + 14);
  const offsets = q + headerSize;

  const push = (entryIdx: number, entryOff: number) => {
    const e = q + entriesStart + entryOff;
    if (e + 8 > buf.length) return;
    const eSize = u16(dv, e);
    const eFlags = u16(dv, e + 2);
    let dataType: number;
    let data: number;
    if (eFlags & ENTRY_FLAG_COMPACT) {
      dataType = eFlags >> 8;
      data = u32(dv, e + 4);
    } else {
      if (eFlags & ENTRY_FLAG_COMPLEX) return; // bags/styles — not needed
      const v = e + eSize;
      dataType = dv.getUint8(v + 3);
      data = u32(dv, v + 4);
    }
    const id = ((pkgId << 24) | (typeId << 16) | entryIdx) >>> 0;
    const list = table.get(id) ?? [];
    list.push({ dataType, data, language, density });
    table.set(id, list);
  };

  if (flags & FLAG_SPARSE) {
    for (let i = 0; i < entryCount; i++) {
      const idx = u16(dv, offsets + i * 4);
      const off = u16(dv, offsets + i * 4 + 2) * 4;
      push(idx, off);
    }
  } else if (flags & FLAG_OFFSET16) {
    for (let i = 0; i < entryCount; i++) {
      const off = u16(dv, offsets + i * 2);
      if (off !== 0xffff) push(i, off * 4);
    }
  } else {
    for (let i = 0; i < entryCount; i++) {
      const off = u32(dv, offsets + i * 4);
      if (off !== 0xffffffff) push(i, off);
    }
  }
}

/** Resolves "@0x7f..." references to a display string, preferring the default / English config. */
export function resolveString(table: ResourceTable | undefined, value: unknown, depth = 0): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('@0x')) return value;
  if (!table || depth > 4) return undefined;
  const id = parseInt(value.slice(3), 16);
  const vals = table.resolve(id);
  const pick = vals.find((v) => v.language === '') ?? vals.find((v) => v.language === 'en') ?? vals[0];
  if (!pick) return undefined;
  if (pick.dataType === 0x03) return table.strings[pick.data];
  if (pick.dataType === 0x01) return resolveString(table, `@0x${pick.data.toString(16).padStart(8, '0')}`, depth + 1);
  return undefined;
}

/** Resolves an icon reference to candidate file paths inside the APK, highest density first. */
export function resolveFiles(table: ResourceTable | undefined, value: unknown, depth = 0): string[] {
  if (typeof value !== 'string' || !value.startsWith('@0x') || !table || depth > 4) return [];
  const id = parseInt(value.slice(3), 16);
  const vals = [...table.resolve(id)].sort((a, b) => densityRank(b.density) - densityRank(a.density));
  const out: string[] = [];
  for (const v of vals) {
    if (v.dataType === 0x03) out.push(table.strings[v.data]);
    else if (v.dataType === 0x01) out.push(...resolveFiles(table, `@0x${v.data.toString(16).padStart(8, '0')}`, depth + 1));
  }
  return out.filter(Boolean);
}

function densityRank(d: number) {
  // 0 = default, 0xfffe = anydpi, 0xffff = nodpi
  if (d === 0xfffe) return 1; // anydpi usually means adaptive XML — least useful for a bitmap
  if (d === 0xffff) return 2;
  if (d === 0) return 3;
  return 10 + d;
}

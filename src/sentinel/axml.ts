/**
 * Android binary XML (AXML) decoder — the format of AndroidManifest.xml inside an APK.
 * Chunk layout follows frameworks/base/libs/androidfw ResourceTypes.h.
 */
import { ParseError, u16, u32, view } from './bytes';

export type AxmlValue = string | number | boolean;

export interface AxmlElement {
  name: string;
  attrs: Record<string, AxmlValue>;
  children: AxmlElement[];
}

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_TYPE = 0x0003;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const RES_XML_END_ELEMENT_TYPE = 0x0103;
const RES_XML_RESOURCE_MAP_TYPE = 0x0180;
const UTF8_FLAG = 1 << 8;

/** Framework attribute IDs (android:*) used when attribute name strings are stripped. */
export const ANDROID_ATTR_IDS: Record<number, string> = {
  0x01010000: 'theme',
  0x01010001: 'label',
  0x01010002: 'icon',
  0x01010003: 'name',
  0x01010006: 'permission',
  0x01010009: 'protectionLevel',
  0x0101000b: 'sharedUserId',
  0x0101000e: 'enabled',
  0x0101000f: 'debuggable',
  0x01010010: 'exported',
  0x01010011: 'process',
  0x01010018: 'authorities',
  0x0101001b: 'grantUriPermissions',
  0x0101001c: 'priority',
  0x01010024: 'value',
  0x01010025: 'resource',
  0x01010026: 'mimeType',
  0x01010027: 'scheme',
  0x01010028: 'host',
  0x0101020c: 'minSdkVersion',
  0x0101021b: 'versionCode',
  0x0101021c: 'versionName',
  0x01010270: 'targetSdkVersion',
  0x01010271: 'maxSdkVersion',
  0x01010272: 'testOnly',
  0x01010280: 'allowBackup',
  0x010102b7: 'installLocation',
  0x010104ec: 'usesCleartextTraffic',
  0x01010527: 'networkSecurityConfig',
  0x0101052c: 'roundIcon',
  0x01010572: 'compileSdkVersion',
  0x01010573: 'compileSdkVersionCodename',
};

export function readStringPool(buf: Uint8Array, start: number): string[] {
  const dv = view(buf);
  const headerSize = u16(dv, start + 2);
  const stringCount = u32(dv, start + 8);
  const flags = u32(dv, start + 16);
  const stringsStart = u32(dv, start + 20);
  const isUtf8 = (flags & UTF8_FLAG) !== 0;
  const out: string[] = new Array(stringCount);
  const offsetsBase = start + headerSize;
  const dataBase = start + stringsStart;
  const dec8 = new TextDecoder('utf-8', { fatal: false });
  for (let i = 0; i < stringCount; i++) {
    try {
      let p = dataBase + u32(dv, offsetsBase + i * 4);
      if (isUtf8) {
        // utf16 length (skip), then utf8 byte length — each 1 or 2 bytes.
        let n = dv.getUint8(p++);
        if (n & 0x80) p++;
        n = dv.getUint8(p++);
        if (n & 0x80) n = ((n & 0x7f) << 8) | dv.getUint8(p++);
        out[i] = dec8.decode(buf.subarray(p, p + n));
      } else {
        let n = u16(dv, p);
        p += 2;
        if (n & 0x8000) {
          n = ((n & 0x7fff) << 16) | u16(dv, p);
          p += 2;
        }
        let s = '';
        for (let k = 0; k < n; k++) s += String.fromCharCode(dv.getUint16(p + k * 2, true));
        out[i] = s;
      }
    } catch {
      out[i] = '';
    }
  }
  return out;
}

function typedValue(dataType: number, data: number, strings: string[]): AxmlValue {
  switch (dataType) {
    case 0x03:
      return strings[data] ?? '';
    case 0x10:
      return data | 0;
    case 0x11:
      return data >>> 0;
    case 0x12:
      return data !== 0;
    case 0x01:
      return `@0x${(data >>> 0).toString(16).padStart(8, '0')}`;
    case 0x02:
      return `?0x${(data >>> 0).toString(16).padStart(8, '0')}`;
    case 0x04: {
      const f = new DataView(new ArrayBuffer(4));
      f.setUint32(0, data, true);
      return f.getFloat32(0, true);
    }
    default:
      return data >>> 0;
  }
}

export function parseAxml(buf: Uint8Array): AxmlElement {
  const dv = view(buf);
  if (buf.length < 8 || u16(dv, 0) !== RES_XML_TYPE) {
    throw new ParseError('AndroidManifest.xml is not binary XML');
  }
  const total = Math.min(u32(dv, 4), buf.length);
  let strings: string[] = [];
  let resourceIds: number[] = [];
  const root: AxmlElement = { name: '#document', attrs: {}, children: [] };
  const stack: AxmlElement[] = [root];

  let p = u16(dv, 2);
  while (p + 8 <= total) {
    const type = u16(dv, p);
    const headerSize = u16(dv, p + 2);
    const size = u32(dv, p + 4);
    if (size < 8 || p + size > buf.length) break;

    if (type === RES_STRING_POOL_TYPE) {
      strings = readStringPool(buf, p);
    } else if (type === RES_XML_RESOURCE_MAP_TYPE) {
      const n = (size - headerSize) / 4;
      resourceIds = [];
      for (let i = 0; i < n; i++) resourceIds.push(u32(dv, p + headerSize + i * 4));
    } else if (type === RES_XML_START_ELEMENT_TYPE) {
      const ext = p + headerSize;
      const nameIdx = u32(dv, ext + 4);
      const attrStart = u16(dv, ext + 8);
      const attrSize = u16(dv, ext + 10) || 20;
      const attrCount = u16(dv, ext + 12);
      const el: AxmlElement = { name: strings[nameIdx] ?? '?', attrs: {}, children: [] };
      for (let i = 0; i < attrCount; i++) {
        const a = ext + attrStart + i * attrSize;
        if (a + 20 > p + size) break;
        const aNameIdx = u32(dv, a + 4);
        const raw = u32(dv, a + 8);
        const dataType = dv.getUint8(a + 15);
        const data = u32(dv, a + 16);
        let aName = strings[aNameIdx] ?? '';
        const resId = aNameIdx < resourceIds.length ? resourceIds[aNameIdx] : 0;
        // Obfuscators blank or rename attribute strings; the resource ID is what Android trusts.
        if (resId && ANDROID_ATTR_IDS[resId]) aName = ANDROID_ATTR_IDS[resId];
        if (!aName) continue;
        el.attrs[aName] = raw !== 0xffffffff && dataType === 0x03 ? strings[raw] ?? '' : typedValue(dataType, data, strings);
      }
      stack[stack.length - 1].children.push(el);
      stack.push(el);
    } else if (type === RES_XML_END_ELEMENT_TYPE) {
      if (stack.length > 1) stack.pop();
    }
    p += size;
  }
  const manifest = root.children[0];
  if (!manifest) throw new ParseError('Manifest has no root element');
  return manifest;
}

export function findAll(el: AxmlElement, name: string, out: AxmlElement[] = []): AxmlElement[] {
  for (const c of el.children) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}

export function child(el: AxmlElement | undefined, name: string): AxmlElement | undefined {
  return el?.children.find((c) => c.name === name);
}

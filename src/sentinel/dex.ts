/**
 * DEX reader: extracts class descriptors, referenced method names for a few sensitive classes,
 * and a filtered view of the string table. We never execute or disassemble bytecode.
 */
import { ParseError, u16, u32, view } from './bytes';

export interface DexSummary {
  version: string;
  classCount: number;
  methodCount: number;
  /** Dotted class names referenced by the file (types table). */
  types: string[];
  /** "java.lang.Runtime#exec" style references for watched classes. */
  methodRefs: Set<string>;
  /** Lower-cased strings that matched a watch-list substring. */
  interestingStrings: Set<string>;
}

const WATCH_CLASSES = new Set([
  'java.lang.Runtime',
  'java.lang.ProcessBuilder',
  'dalvik.system.DexClassLoader',
  'dalvik.system.InMemoryDexClassLoader',
  'dalvik.system.PathClassLoader',
  'java.lang.System',
  'android.telephony.SmsManager',
  'android.telephony.TelephonyManager',
  'android.app.admin.DevicePolicyManager',
  'android.content.pm.PackageManager',
  'android.content.pm.PackageInstaller',
  'java.lang.reflect.Method',
  'android.media.MediaRecorder',
  'android.media.projection.MediaProjectionManager',
  'android.view.WindowManager',
  'android.accessibilityservice.AccessibilityService',
  'android.webkit.WebView',
]);

const STRING_WATCH = [
  '/system/xbin/su',
  '/system/bin/su',
  'superuser.apk',
  'magisk',
  'com.noshufou.android.su',
  'goldfish',
  'ranchu',
  'genymotion',
  'generic_x86',
  'frida',
  'xposed',
  'addjavascriptinterface',
  'setjavascriptenabled',
  'android.intent.action.new_outgoing_call',
  'pm install',
  'chmod 777',
];

function readUleb(dv: DataView, off: number): [number, number] {
  let result = 0;
  let shift = 0;
  let b: number;
  let p = off;
  do {
    b = dv.getUint8(p++);
    result |= (b & 0x7f) << shift;
    shift += 7;
  } while (b & 0x80 && shift < 35);
  return [result >>> 0, p];
}

/** MUTF-8 is close enough to UTF-8 for descriptor/ASCII matching; decode leniently. */
const dec = new TextDecoder('utf-8', { fatal: false });

function readDexString(buf: Uint8Array, dv: DataView, off: number): string {
  const [, p] = readUleb(dv, off);
  let e = p;
  while (e < buf.length && buf[e] !== 0) e++;
  return dec.decode(buf.subarray(p, e));
}

export function parseDex(buf: Uint8Array): DexSummary {
  if (buf.length < 0x70 || buf[0] !== 0x64 || buf[1] !== 0x65 || buf[2] !== 0x78) {
    throw new ParseError('Not a DEX file');
  }
  const dv = view(buf);
  const version = String.fromCharCode(buf[4], buf[5], buf[6]);
  const stringIdsSize = u32(dv, 0x38);
  const stringIdsOff = u32(dv, 0x3c);
  const typeIdsSize = u32(dv, 0x40);
  const typeIdsOff = u32(dv, 0x44);
  const methodIdsSize = u32(dv, 0x58);
  const methodIdsOff = u32(dv, 0x5c);
  const classDefsSize = u32(dv, 0x60);

  const stringCache = new Map<number, string>();
  const str = (idx: number) => {
    let s = stringCache.get(idx);
    if (s === undefined) {
      s = idx < stringIdsSize ? readDexString(buf, dv, u32(dv, stringIdsOff + idx * 4)) : '';
      stringCache.set(idx, s);
    }
    return s;
  };

  const types: string[] = new Array(typeIdsSize);
  for (let i = 0; i < typeIdsSize; i++) {
    const d = str(u32(dv, typeIdsOff + i * 4));
    types[i] = d.startsWith('L') && d.endsWith(';') ? d.slice(1, -1).replace(/\//g, '.') : d;
  }

  const methodRefs = new Set<string>();
  for (let i = 0; i < methodIdsSize; i++) {
    const m = methodIdsOff + i * 8;
    const cls = types[u16(dv, m)];
    if (cls && WATCH_CLASSES.has(cls)) methodRefs.add(`${cls}#${str(u32(dv, m + 4))}`);
  }

  const interestingStrings = new Set<string>();
  for (let i = 0; i < stringIdsSize; i++) {
    const off = u32(dv, stringIdsOff + i * 4);
    // Cheap pre-filter on length byte to skip enormous strings.
    const s = readDexString(buf, dv, off);
    if (s.length < 3 || s.length > 200) continue;
    const lower = s.toLowerCase();
    for (const w of STRING_WATCH) {
      if (lower.includes(w)) {
        interestingStrings.add(w);
        break;
      }
    }
  }

  return {
    version,
    classCount: classDefsSize,
    methodCount: methodIdsSize,
    types: types.filter(Boolean),
    methodRefs,
    interestingStrings,
  };
}

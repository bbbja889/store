/** RFC 3492 Punycode decoder (for xn-- labels). */
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;

function adapt(delta: number, numPoints: number, first: boolean) {
  let k = 0;
  delta = first ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digit(cp: number) {
  if (cp >= 48 && cp <= 57) return cp - 22;
  if (cp >= 65 && cp <= 90) return cp - 65;
  if (cp >= 97 && cp <= 122) return cp - 97;
  return BASE;
}

export function punycodeDecode(input: string): string {
  const out: number[] = [];
  let n = 128;
  let i = 0;
  let bias = 72;
  const b = input.lastIndexOf('-');
  if (b > 0) for (let j = 0; j < b; j++) out.push(input.charCodeAt(j));
  for (let p = b > 0 ? b + 1 : 0; p < input.length; ) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (p >= input.length) throw new Error('bad punycode');
      const d = digit(input.charCodeAt(p++));
      if (d >= BASE) throw new Error('bad punycode digit');
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

export function toUnicodeHost(host: string): string {
  return host
    .split('.')
    .map((l) => {
      if (!l.toLowerCase().startsWith('xn--')) return l;
      try {
        return punycodeDecode(l.slice(4));
      } catch {
        return l;
      }
    })
    .join('.');
}

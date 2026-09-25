export function bytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function shortHash(hex: string, head = 8, tail = 6): string {
  if (!hex) return '';
  return hex.length <= head + tail ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function colonHex(hex: string): string {
  return hex.toUpperCase().match(/.{1,2}/g)?.join(':') ?? '';
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export const ANDROID_VERSIONS: Record<number, string> = {
  21: '5.0', 22: '5.1', 23: '6', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1', 28: '9', 29: '10', 30: '11',
  31: '12', 32: '12L', 33: '13', 34: '14', 35: '15', 36: '16', 37: '17',
};

export function androidName(api: number | null | undefined): string {
  if (!api) return '—';
  return ANDROID_VERSIONS[api] ? `Android ${ANDROID_VERSIONS[api]} (API ${api})` : `API ${api}`;
}

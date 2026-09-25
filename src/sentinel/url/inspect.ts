/**
 * Link X-ray — offline phishing heuristics for a single URL.
 * Deterministic and synchronous; nothing is fetched and nothing leaves the device.
 */
import { scoreFindings } from '../score';
import type { Finding, Grade, Verdict } from '../types';
import { toUnicodeHost } from './punycode';
import {
  ASCII_SKELETON,
  BRANDS,
  CONFUSABLES,
  DANGEROUS_EXT,
  FREE_HOSTS,
  MULTI_SUFFIXES,
  RISKY_TLDS,
  SCAM_WORDS,
  SHORTENERS,
  type Brand,
} from './data';

export type Script = 'latin' | 'cyrillic' | 'greek' | 'armenian' | 'digit' | 'symbol' | 'other';

export interface HostChar {
  ch: string;
  script: Script;
  /** Imitates this Latin letter, if it is a non-Latin lookalike. */
  imitates: string | null;
}

export interface LinkReport {
  input: string;
  href: string | null;
  scheme: string | null;
  host: string;
  unicodeHost: string;
  registrable: string;
  tld: string;
  subdomain: string;
  path: string;
  hostChars: HostChar[];
  brand: { name: string; official: boolean } | null;
  score: number;
  grade: Grade;
  verdict: Verdict;
  findings: Finding[];
}

export function scriptOf(ch: string): Script {
  const cp = ch.codePointAt(0)!;
  if ((cp >= 0x61 && cp <= 0x7a) || (cp >= 0x41 && cp <= 0x5a) || (cp >= 0xc0 && cp <= 0x24f)) return 'latin';
  if (cp >= 0x30 && cp <= 0x39) return 'digit';
  if (cp === 0x2d || cp === 0x2e || cp === 0x5f) return 'symbol';
  if (cp >= 0x400 && cp <= 0x52f) return 'cyrillic';
  if (cp >= 0x370 && cp <= 0x3ff) return 'greek';
  if (cp >= 0x530 && cp <= 0x58f) return 'armenian';
  return 'other';
}

export function skeleton(s: string): string {
  let out = '';
  for (const ch of s.toLowerCase()) out += CONFUSABLES[ch] ?? ch;
  out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, rep] of ASCII_SKELETON) out = out.replace(re, rep);
  return out.replace(/-/g, '');
}

/** Optimal-string-alignment Damerau–Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function splitHost(host: string): { registrable: string; suffix: string; subdomain: string } {
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 1) return { registrable: host, suffix: '', subdomain: '' };
  let suffixLen = 1;
  for (const n of [3, 2]) {
    if (labels.length > n) {
      const cand = labels.slice(-n).join('.');
      if (MULTI_SUFFIXES.has(cand) || FREE_HOSTS.has(cand)) {
        suffixLen = n;
        break;
      }
    }
  }
  const registrable = labels.slice(-(suffixLen + 1)).join('.');
  return {
    registrable,
    suffix: labels.slice(-suffixLen).join('.'),
    subdomain: labels.slice(0, -(suffixLen + 1)).join('.'),
  };
}

const isIPv4 = (h: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^0x[0-9a-f]+$/i.test(h) || /^\d{8,10}$/.test(h);

function isOfficial(brand: Brand, host: string, registrable: string) {
  return brand.domains.some((d) => registrable === d || host === d || host.endsWith(`.${d}`));
}

export function inspectLink(raw: string): LinkReport {
  const input = raw.trim();
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  let url: URL | null = null;
  let candidate = input;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;
  try {
    url = new URL(candidate);
  } catch {
    url = null;
  }

  if (!url) {
    add({ id: 'invalid', category: 'integrity', severity: 'high', penalty: 40, title: 'Not a valid link', detail: 'This cannot be parsed as a web address.' });
    const s = scoreFindings(findings);
    return { input, href: null, scheme: null, host: '', unicodeHost: '', registrable: '', tld: '', subdomain: '', path: '', hostChars: [], brand: null, ...s };
  }

  const scheme = url.protocol.replace(':', '');
  if (['javascript', 'data', 'file', 'vbscript'].includes(scheme)) {
    add({ id: 'scheme', category: 'integrity', severity: 'critical', penalty: 70, title: `"${scheme}:" link`, detail: 'This is not a website — it runs code or opens local content when tapped.' });
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const unicodeHost = toUnicodeHost(host);
  const { registrable, suffix, subdomain } = splitHost(host);
  const tld = host.split('.').pop() ?? '';
  const regLabel = registrable.slice(0, registrable.length - suffix.length - 1) || registrable;
  const unicodeRegLabel = toUnicodeHost(regLabel);
  const hostChars: HostChar[] = [...unicodeHost].map((ch) => {
    const script = scriptOf(ch);
    return { ch, script, imitates: script !== 'latin' && script !== 'digit' && script !== 'symbol' ? CONFUSABLES[ch] ?? null : null };
  });

  if (scheme === 'http') {
    add({ id: 'http', category: 'integrity', severity: 'medium', penalty: 12, title: 'No encryption (http)', detail: 'Anything you type here travels in plain text. Real banks and stores always use https.' });
  } else if (scheme === 'https') {
    add({ id: 'https', category: 'integrity', severity: 'good', penalty: 0, title: 'Encrypted connection (https)', detail: 'Note: scam sites use https too — the padlock only means the connection is private, not that the site is honest.' });
  }

  if (url.username || url.password || /@/.test(input.split('/').slice(0, 3).join('/'))) {
    add({ id: 'userinfo', category: 'combo', severity: 'high', penalty: 25, title: 'Hidden destination with "@"', detail: `Everything before "@" is ignored by the browser. This link really goes to ${unicodeHost}.` });
  }

  if (isIPv4(host) || host.startsWith('[')) {
    add({ id: 'ip-host', category: 'combo', severity: 'high', penalty: 22, title: 'Raw IP address instead of a name', detail: 'Legit services use domain names. A bare IP hides who you are talking to.' });
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    add({ id: 'port', category: 'integrity', severity: 'low', penalty: 5, title: `Unusual port :${url.port}`, detail: 'Consumer websites almost never need a custom port.' });
  }

  // — International domain / homograph checks
  const nonLatin = hostChars.filter((c) => c.script === 'cyrillic' || c.script === 'greek' || c.script === 'armenian' || c.script === 'other');
  if (nonLatin.length) {
    const labelScripts = unicodeHost.split('.').map((l) => new Set([...l].map(scriptOf).filter((s) => s !== 'digit' && s !== 'symbol')));
    const mixed = labelScripts.some((s) => s.has('latin') && s.size > 1);
    const lookalikes = nonLatin.filter((c) => c.imitates);
    if (mixed) {
      add({ id: 'homograph-mixed', category: 'combo', severity: 'critical', penalty: 40, title: 'Mixed alphabets in one name', detail: `Latin letters are mixed with ${[...new Set(nonLatin.map((c) => c.script))].join('/')} lookalikes (${lookalikes.map((c) => `"${c.ch}"→${c.imitates}`).join(', ') || 'non-Latin characters'}). This is the classic homograph trick.` });
    } else if (lookalikes.length === nonLatin.length) {
      add({ id: 'homograph-whole', category: 'combo', severity: 'high', penalty: 20, title: 'Written entirely in lookalike letters', detail: `Every letter imitates a Latin one. Displayed as "${unicodeHost}", encoded as "${host}".` });
    } else {
      add({ id: 'idn', category: 'integrity', severity: 'low', penalty: 3, title: 'International domain name', detail: `Encoded as "${host}". Fine for local-language sites; check it is the one you expect.` });
    }
  }

  // — Brand impersonation
  const skelLabel = skeleton(unicodeRegLabel);
  const labelParts = unicodeRegLabel.split('-').map(skeleton);
  const subSkel = toUnicodeHost(subdomain).split(/[.-]/).filter(Boolean).map(skeleton);
  const pathSkel = decodeURIComponentSafe(url.pathname).toLowerCase().split(/[^a-z0-9\u0080-￿]+/).filter(Boolean).map(skeleton);
  let brand: LinkReport['brand'] = null;
  let brandFinding: Finding | null = null;
  const rank = (f: Finding) => ({ critical: 4, high: 3, medium: 2, low: 1, info: 0, good: 0 })[f.severity];
  const consider = (f: Finding, b: Brand, official: boolean) => {
    if (!brandFinding || rank(f) > rank(brandFinding)) {
      brandFinding = f;
      brand = { name: b.name, official };
    }
  };
  for (const b of BRANDS) {
    const official = isOfficial(b, host, registrable);
    if (official) {
      brand = { name: b.name, official: true };
      brandFinding = null;
      add({ id: 'official', category: 'integrity', severity: 'good', penalty: 0, title: `Official ${b.name} domain`, detail: `${registrable} belongs to ${b.name}.` });
      break;
    }
    for (const token of b.tokens) {
      const t = skeleton(token);
      const rawLabel = unicodeRegLabel.replace(/-/g, '');
      if (skelLabel === t) {
        if (rawLabel === token) {
          consider({ id: 'brand-unofficial-tld', category: 'combo', severity: 'high', penalty: 30, title: `Uses the ${b.name} name on a domain it doesn't own`, detail: `${registrable} is not one of ${b.name}'s official domains (${b.domains.slice(0, 3).join(', ')}).` }, b, false);
        } else {
          consider({ id: 'brand-lookalike', category: 'combo', severity: 'critical', penalty: 45, title: `Impersonates ${b.name}`, detail: `"${unicodeRegLabel}" is spelled to look like "${token}" but it is a different address.` }, b, false);
        }
      } else if (t.length >= 5 && editDistance(skelLabel, t) <= (t.length >= 8 ? 2 : 1)) {
        consider({ id: 'brand-typosquat', category: 'combo', severity: 'high', penalty: 32, title: `Typo-squat of ${b.name}`, detail: `"${unicodeRegLabel}" is one or two keystrokes away from "${token}".` }, b, false);
      } else if ((t.length >= 4 && skelLabel.includes(t)) || labelParts.includes(t)) {
        consider({ id: 'brand-combo', category: 'combo', severity: 'high', penalty: 28, title: `"${b.name}" plus extra words`, detail: `Scammers register names like "${unicodeRegLabel}" to borrow ${b.name}'s trust. The real site is ${b.domains[0]}.` }, b, false);
      } else if (subSkel.includes(t) || (t.length >= 5 && subSkel.some((s) => s.includes(t)))) {
        consider({ id: 'brand-subdomain', category: 'combo', severity: 'high', penalty: 30, title: `${b.name} appears only in the subdomain`, detail: `The address starts with "${b.tokens[0]}" but really belongs to ${registrable}. Read domains from the right.` }, b, false);
      } else if (pathSkel.includes(t)) {
        consider({ id: 'brand-path', category: 'combo', severity: 'medium', penalty: 10, title: `Mentions ${b.name} in the path`, detail: `The page claims to be about ${b.name}, but the site is ${registrable}.` }, b, false);
      }
    }
  }
  if (brandFinding) add(brandFinding);

  // — Platform & structure
  if (SHORTENERS.has(registrable) || SHORTENERS.has(host)) {
    add({ id: 'shortener', category: 'integrity', severity: 'medium', penalty: 12, title: 'Shortened link', detail: 'The real destination is hidden behind a redirect. Expand it before trusting it.' });
  }
  if (FREE_HOSTS.has(suffix)) {
    add({ id: 'free-host', category: 'integrity', severity: 'medium', penalty: 8, title: `Hosted on ${suffix}`, detail: 'A free hosting platform — anyone can publish a page here in minutes.' });
  }
  if (RISKY_TLDS[tld]) {
    add({ id: 'tld', category: 'integrity', severity: 'medium', penalty: 10, title: `".${tld}" domain`, detail: `This ending is ${RISKY_TLDS[tld]}.` });
  }
  const depth = subdomain ? subdomain.split('.').length : 0;
  if (depth >= 3) add({ id: 'deep-subdomain', category: 'integrity', severity: 'low', penalty: 6, title: `${depth} levels of subdomain`, detail: 'Long chains of subdomains push the real domain out of view on phone screens.' });
  if ((regLabel.match(/-/g) ?? []).length >= 3) add({ id: 'hyphens', category: 'integrity', severity: 'low', penalty: 5, title: 'Many hyphens', detail: 'Names like "secure-login-verify-account" are typical of throwaway phishing domains.' });
  if (host.length > 50 || input.length > 150) add({ id: 'long', category: 'integrity', severity: 'low', penalty: 4, title: 'Unusually long address', detail: 'Length is used to hide the part that matters.' });

  const hay = `${toUnicodeHost(host)} ${decodeURIComponentSafe(url.pathname + url.search)}`.toLowerCase();
  const words = SCAM_WORDS.filter((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(hay));
  if (words.length >= 2) {
    add({ id: 'scam-words', category: 'combo', severity: 'medium', penalty: 12, title: 'Urgency / reward wording', detail: `Contains "${words.slice(0, 4).join('", "')}" — the vocabulary of KYC, refund and reward scams.` });
  } else if (words.length === 1 && brandFinding) {
    add({ id: 'scam-words', category: 'combo', severity: 'low', penalty: 4, title: `Mentions "${words[0]}"`, detail: 'Combined with a brand name, this is a common scam phrasing.' });
  }

  const ext = url.pathname.split('.').pop()?.toLowerCase() ?? '';
  if (url.pathname.includes('.') && DANGEROUS_EXT[ext]) {
    add({ id: 'download', category: 'combo', severity: 'high', penalty: ext === 'apk' ? 20 : 22, title: `Direct download of ${DANGEROUS_EXT[ext]}`, detail: ext === 'apk' ? 'Links that go straight to an APK are how fake bank and "update" apps spread. X-ray the file with Sentinel before installing.' : 'Executable downloads from links are a common malware route.' });
  }
  if ((input.match(/%[0-9a-f]{2}/gi) ?? []).length >= 8) {
    add({ id: 'encoded', category: 'integrity', severity: 'low', penalty: 5, title: 'Heavily encoded characters', detail: 'Percent-encoding is used to hide words from filters and people.' });
  }

  const s = scoreFindings(findings);
  return {
    input,
    href: url.href,
    scheme,
    host,
    unicodeHost,
    registrable,
    tld,
    subdomain,
    path: url.pathname + url.search,
    hostChars,
    brand,
    ...s,
  };
}

function decodeURIComponentSafe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

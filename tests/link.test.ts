import { describe, expect, it } from 'vitest';
import { inspectLink, skeleton, editDistance, splitHost } from '../src/sentinel/url/inspect';
import { punycodeDecode } from '../src/sentinel/url/punycode';

const ids = (u: string) => inspectLink(u).findings.map((f) => f.id);

describe('punycode', () => {
  it('decodes the well-known apple homograph', () => {
    expect(punycodeDecode('80ak6aa92e')).toBe('аррӏе');
    expect(punycodeDecode('mnchen-3ya')).toBe('münchen');
  });
});

describe('helpers', () => {
  it('skeletonises lookalikes and measures edits', () => {
    expect(skeleton('pаypa1')).toBe(skeleton('paypal'));
    expect(skeleton('rnicrosoft')).toBe(skeleton('microsoft'));
    expect(editDistance('flipkart', 'flipkrat')).toBe(1);
  });
  it('finds the registrable domain', () => {
    expect(splitHost('a.b.hdfcbank.co.in').registrable).toBe('hdfcbank.co.in');
    expect(splitHost('evil.github.io').registrable).toBe('evil.github.io');
    expect(splitHost('sbi.co.in').registrable).toBe('sbi.co.in');
  });
});

describe('Link X-ray', () => {
  it('trusts official domains', () => {
    const r = inspectLink('https://www.paypal.com/signin');
    expect(r.brand).toEqual({ name: 'PayPal', official: true });
    expect(r.verdict).toBe('clean');
    expect(inspectLink('https://onlinesbi.sbi/').verdict).toBe('clean');
  });
  it('catches whole-script homographs', () => {
    const r = inspectLink('https://xn--80ak6aa92e.com/');
    expect(r.unicodeHost).toBe('аррӏе.com');
    expect(ids('https://xn--80ak6aa92e.com/')).toEqual(expect.arrayContaining(['homograph-whole', 'brand-lookalike']));
    expect(r.verdict).toBe('danger');
  });
  it('catches mixed-script homographs typed directly', () => {
    const r = inspectLink('https://pаypal.com/login'); // Cyrillic "а"
    expect(r.findings.map((f) => f.id)).toEqual(expect.arrayContaining(['homograph-mixed', 'brand-lookalike']));
    expect(r.hostChars.find((c) => c.script === 'cyrillic')?.imitates).toBe('a');
  });
  it('catches typo-squats, brand-in-subdomain and KYC scams', () => {
    expect(ids('https://flipkrat.com')).toContain('brand-typosquat');
    expect(ids('http://paypal.com.account-verify.secure-login.top/signin')).toEqual(expect.arrayContaining(['brand-subdomain', 'tld', 'http', 'scam-words']));
    const kyc = inspectLink('http://sbi-kyc-update.in/verify.apk');
    expect(kyc.findings.map((f) => f.id)).toEqual(expect.arrayContaining(['brand-combo', 'download', 'scam-words']));
    expect(kyc.verdict).toBe('danger');
  });
  it('flags userinfo tricks, IPs and shorteners', () => {
    expect(ids('https://google.com@198.51.100.7/login')).toEqual(expect.arrayContaining(['userinfo', 'ip-host']));
    expect(ids('https://bit.ly/3abcd')).toContain('shortener');
    expect(ids('javascript:alert(1)')).toContain('scheme');
  });
  it('keeps ordinary sites calm', () => {
    const r = inspectLink('https://excalidraw.com');
    expect(r.verdict).toBe('clean');
    expect(r.score).toBeGreaterThanOrEqual(95);
  });
});

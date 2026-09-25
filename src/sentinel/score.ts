import type { Finding, Grade, Severity, Verdict } from './types';

const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, good: 5 };

export function gradeFor(score: number): Grade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 72) return 'B';
  if (score >= 58) return 'C';
  if (score >= 42) return 'D';
  return 'F';
}

/** 100 minus penalties; any critical finding caps the verdict at "danger". */
export function scoreFindings(findings: Finding[]): { score: number; grade: Grade; verdict: Verdict; findings: Finding[] } {
  const total = findings.reduce((s, f) => s + f.penalty, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const critical = findings.some((f) => f.severity === 'critical');
  const high = findings.filter((f) => f.severity === 'high').length;
  let verdict: Verdict = score >= 72 && high === 0 ? 'clean' : score >= 45 ? 'caution' : 'danger';
  if (critical) verdict = 'danger';
  const sorted = [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.penalty - a.penalty);
  return { score, grade: gradeFor(score), verdict, findings: sorted };
}

export const VERDICT_COPY: Record<Verdict, { title: string; line: string }> = {
  clean: { title: 'Clean signal', line: 'Nothing alarming found. Still only install what you trust.' },
  caution: { title: 'Caution', line: 'Some signals deserve a look before you install.' },
  danger: { title: 'High risk', line: 'Patterns commonly seen in harmful apps. Think twice.' },
};

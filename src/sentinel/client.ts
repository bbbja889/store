import type { ApkReport, Stage } from './types';
import type { WorkerRequest, WorkerResponse } from './worker';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (r: ApkReport) => void; reject: (e: Error) => void; onProgress?: (s: Stage, d?: string) => void }>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'sentinel' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const job = pending.get(msg.id);
    if (!job) return;
    if (msg.kind === 'progress') job.onProgress?.(msg.stage, msg.detail);
    else {
      pending.delete(msg.id);
      if (msg.kind === 'result') job.resolve(msg.report);
      else job.reject(new Error(msg.message));
    }
  };
  worker.onerror = (e) => {
    for (const [, job] of pending) job.reject(new Error(e.message || 'Sentinel worker crashed'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export const MAX_APK_BYTES = 700 * 1024 * 1024;

/** Analyses an APK entirely on this device, in a Web Worker. Nothing is uploaded. */
export async function scanApk(file: File | Blob, name: string, onProgress?: (stage: Stage, detail?: string) => void): Promise<ApkReport> {
  if (file.size > MAX_APK_BYTES) throw new Error('That file is larger than 700 MB — too big to analyse in a browser tab.');
  const buffer = await file.arrayBuffer();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, buffer, name } satisfies WorkerRequest, [buffer]);
  });
}

export function iconUrl(report: ApkReport): string | null {
  if (!report.icon) return null;
  return URL.createObjectURL(new Blob([report.icon.bytes as BlobPart], { type: report.icon.mime }));
}

/** JSON-safe copy of a report (drops the icon bytes). */
export function reportToJson(report: ApkReport): string {
  return JSON.stringify({ ...report, icon: report.icon ? { mime: report.icon.mime, bytes: report.icon.bytes.length } : null }, null, 2);
}

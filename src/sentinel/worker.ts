/// <reference lib="webworker" />
import { analyzeApk } from './analyze';
import type { Stage } from './types';

declare const self: DedicatedWorkerGlobalScope;

export type WorkerRequest = { id: number; buffer: ArrayBuffer; name: string };
export type WorkerResponse =
  | { id: number; kind: 'progress'; stage: Stage; detail?: string }
  | { id: number; kind: 'result'; report: import('./types').ApkReport }
  | { id: number; kind: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, name } = e.data;
  try {
    const report = await analyzeApk(new Uint8Array(buffer), name, (stage, detail) =>
      self.postMessage({ id, kind: 'progress', stage, detail } satisfies WorkerResponse),
    );
    // The icon is a view into the whole APK buffer; copy it so only the icon is transferred.
    if (report.icon) report.icon = { ...report.icon, bytes: report.icon.bytes.slice() };
    self.postMessage({ id, kind: 'result', report } satisfies WorkerResponse, report.icon ? [report.icon.bytes.buffer as ArrayBuffer] : []);
  } catch (err) {
    self.postMessage({ id, kind: 'error', message: (err as Error).message || 'Could not read this file.' } satisfies WorkerResponse);
  }
};

#!/usr/bin/env node
// Generates the synthetic, inert sample APKs served from public/samples/ for the Sentinel Lab.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanSample, riskySample } from './lib/samples.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'orbit-notes-demo.apk'), cleanSample());
writeFileSync(join(out, 'kyc-update-risky-sample.apk'), riskySample());
console.log('Samples written to', out);

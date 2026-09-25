# VICZO Store

**See inside every app before it sees inside you.**

VICZO is an app & website store where every Android APK is X-rayed **on your own device** — permissions, trackers, signatures, certificate, SHA-256 — and every link is checked for disguises. It is wrapped in a single persistent 3D world with a 16-second cinematic intro.

> Full design document — story bible, shot-by-shot intro script, chapter plan, engine spec and iteration log: **[docs/REMASTER_PLAN.md](docs/REMASTER_PLAN.md)**

## The real-world problem

Sideloaded APKs and links forwarded over SMS/WhatsApp are where most phone scams start: banking trojans (overlay + SMS), predatory loan apps (contacts + call logs + photos), stalkerware, droppers, repackaged "mods", and look-alike domains such as `аpple.com` written with a Cyrillic "а". Before installing, nobody can see what an APK really contains.

## What it does

| Feature | How |
| --- | --- |
| **APK X-ray** (`/scan`) | Unzips the APK in a Web Worker, decodes the binary `AndroidManifest.xml`, resolves label/icon via `resources.arsc`, scans every `classes*.dex` for tracker SDKs and risky APIs, parses the APK Signing Block (v2/v3/v3.1) and v1 certificates, **cryptographically verifies the signature and recomputes the content digest with WebCrypto**, then produces an explained 0–100 Trust score. Nothing is uploaded. |
| **Link X-ray** | Offline: punycode decoding, mixed-/whole-script homographs, brand typo-squats, brand-in-subdomain, abused TLDs, shorteners, `@` tricks, direct APK downloads, KYC/refund scam wording. |
| **Trust Passport** | Every app listing carries a compact Sentinel report (score, reasons, permissions in plain language, trackers, signer, fingerprints). |
| **Verify a download** | Drop the file you downloaded; its SHA-256 and signing certificate are compared with the listing's passport — catches tampered or re-signed copies. |
| **The Forge** (`/upload`) | Publish with Google sign-in: the APK is scanned locally, metadata is auto-filled, the passport and an https download link are stored in Firestore. |

## The experience

- **Intro film** — gate with real loading and a sound choice → pulse → storm of app tiles with glitching "masks" → ember & tide energy dragons → fusion with real bullet time → the Sentinel laser shatters masks → particle **VICZO** wordmark sliced by a blade of light → the camera lands on the homepage with no cut. Skippable (Esc), shortened for returning visitors, disabled for `prefers-reduced-motion`. Replay from the footer, ⌘K, or `/intro`.
- **Home as a story** — Core → The Noise → The Sentinel → Quarantine (Rapier rigid-body physics you can tap) → The Passport → The Vault (catalog) → The Forge → finale credits portal.
- Procedural Web Audio sound design (no audio files), Lenis smooth scrolling, critically-damped camera, bloom/grain/chromatic aberration, quality tiers and automatic degradation.

## Tech

React 19 · TypeScript (strict) · Vite 7 · Tailwind v4 · React Three Fiber / drei / postprocessing · Rapier · motion · zustand · Lenis · fflate · Firebase Auth + Firestore · Vitest.

```
src/sentinel/   analysis engine (pure TS, runs in a worker) + url/ Link X-ray
src/world/      the 3D world: director, core, packets, serpents, title, sets/
src/intro/      film script (timings, camera keys) + DOM overlay
src/sections/   home chapters        src/pages/   routes
src/data/       catalog, passports, demo listings
scripts/        synthetic APK builder, sample + demo-passport generators
tests/          engine tests (parsing, verification, tampering, links)
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine tests
npm run lint       # strict type-check
npm run build
```

Useful URL flags: `?nointro` skips the film, `?intro` forces the full film, `?tier=1|2|3` forces a quality tier.

Regenerate the synthetic samples and demo passports (they contain no executable code):

```bash
npm run samples
npx vite-node scripts/build-demo-catalog.ts
```

## Data & security notes

- Firebase client config lives in `firebase-applet-config.json`; deploy the tightened `firestore.rules` (type/size validation, https-only links, owners cannot self-verify).
- Errors shown to users no longer include email/uid/provider data.
- Demo apps are **fictional**; their passports were produced by the real engine from synthetic builds. Demo websites are real, well-known free tools; their Link X-ray runs live. Set `VITE_DEMO_CATALOG=false` to hide them.
- Sentinel is static pre-install analysis, not an antivirus. A passport generated in a publisher's browser can be forged — which is exactly why anyone can re-verify the real download.

Crafted by **Yashraj Ghemud**.

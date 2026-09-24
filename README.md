<p align="center">
  <img src="./.github/readme-assets/signal.gif" alt="Animated signal / product visual for VICZO-STORE" width="100%" />
</p>

<h1 align="center">VICZO-STORE</h1>

<p align="center"><strong>A client-side React + Vite storefront for browsing and submitting Android APKs and curated websites backed by Firebase Auth and Firestore.</strong></p>

<p align="center"><code>REPO//SIGNAL</code> · <code>SIGNAL / PRODUCT</code> · <code>LOOPING README EXPERIENCE</code></p>

## Live signal

| Lens | Readout |
| --- | --- |
| Portfolio lane | **SIGNAL / PRODUCT** |
| Code surface | **30** tracked files observed |
| Primary materials | **React TSX, JSON, TypeScript, Markdown** |
| Verification | **0** test-related files observed |

> A moving scan of the project surface. The animated frame above is a lightweight visual signature; the sections below remain the source of truth for implementation details.

## Motion map

`SIGNAL` → `SHAPE` → `RELEASE`

Use the animated banner as the first signal, then move into the implementation dossier. The recommended next step is to verify the documented setup command against the repository scripts before extending the project.

<details open>
<summary><strong>Open the full project dossier</strong></summary>

## Overview
A single-page React + TypeScript app (Vite) that lists apps and websites from Firestore in real time, provides detail pages, and exposes an authenticated upload form. UI uses Tailwind, Framer Motion and small design-system primitives.

## What it does
- Shows realtime lists and detail pages for "apps" and "websites" using Firestore onSnapshot listeners.
- Lets authenticated users sign in with Google (Firebase Auth) and submit entries via a client-side upload form.
- Provides animated UI pieces (cinematic intro, interactive particle background) and reusable UI primitives (Button, Badge).

## Key capabilities
- Realtime Firestore reads for lists and details.
- Google sign-in via Firebase Auth.
- Upload form that writes new documents to Firestore (client-side).
- Animated UI with Framer Motion and Tailwind-based styling.
- Global error handling via an ErrorBoundary that attempts to parse structured Firestore errors.

## Technology
- React 19 + TypeScript
- Vite
- Tailwind CSS (via @tailwindcss/vite)
- Framer Motion
- Firebase (Auth + Firestore)
- class-variance-authority, lucide-react, Radix Slot
- Note: express is listed in package.json but no server code is present in the supplied files.

## Repository structure
Top-level notable files:
- package.json (dev scripts: dev, build, preview, clean, lint)
- vite.config.ts
- index.html
- firebase-applet-config.json (committed Firebase client config)
- firebase-blueprint.json
- firestore.rules
- .env.example
- src/ (React app code; pages and components)
- start.mp4 / end.mp4 (demo videos)

Notable source files referenced:
- src/firebase.ts — Firebase initialization (reads firebase-applet-config.json)
- src/pages/*.tsx — Home, Upload, AppDetail, WebsiteDetail, CinematicIntro, etc.
- src/components/layout/Layout.tsx — layout and interactive background
- src/components/ErrorBoundary.tsx — global error parsing and display
- src/components/ui/* — Button, Badge; Card is referenced but missing in dossier

Missing or incomplete files noted in the workspace:
- src/components/layout/Navbar.tsx (referenced but not present)
- src/components/ui/Card.tsx (Card, CardContent referenced)
- src/data/mockData.ts (imported in pages but not present)
- Several page files are truncated in the provided excerpts

## Getting started
Evidence-based quick start:
- Prerequisite: Node.js (existing repository instructions list Node.js).
- Install dependencies: npm install
- Set the GEMINI_API_KEY environment variable if required (vite.config.ts references process.env.GEMINI_API_KEY). The existing README suggests using .env.local to set GEMINI_API_KEY.
- Run dev server: npm run dev

If you wish to inspect configuration or runtime wiring before running:
- firebase-applet-config.json — client Firebase config committed to repo (used by src/firebase.ts).
- firestore.rules — Firestore security rules included at repo root.
- vite.config.ts — references GEMINI_API_KEY and other build-time env usage.
- package.json — scripts and declared dependencies.

Note: the repo contains a committed firebase-applet-config.json file. See Configuration and Safety sections below before running or deploying.

## Configuration
- Firebase config: firebase-applet-config.json is present and is used by the client (src/firebase.ts).
- Firestore rules: firestore.rules exists in the repo and encodes the intended security model (public read for apps/websites, authenticated create, owner-restricted update/delete as documented in the project summary).
- Environment: vite.config.ts reads process.env.GEMINI_API_KEY; .env.example is present but content is not guaranteed.
- Scripts (package.json): dev, build, preview, clean, lint (lint = tsc --noEmit).

If details are missing for local setup (for example exact env variable values or missing components), inspect the files above and the relevant src/* pages noted in the Repository structure.

## Development and quality notes
- Type-checking: lint script runs TypeScript (tsc --noEmit).
- Tests/CI: No tests, CI configuration, or test scripts were found in the provided repository excerpts.
- Missing modules and data: Several referenced components and data files are absent (Navbar, Card, mockData). Restoring these is a primary next step before a clean build.
- Unused dependencies: express is listed as a dependency but no server files are present in the supplied files.
- Error handling: Firestore error handling code constructs JSON objects that include auth.currentUser details and throws JSON-encoded errors. The ErrorBoundary attempts to parse and display those structured errors; this may expose sensitive data (see Safety).

## Safety and responsible use
- Committed Firebase config: firebase-applet-config.json (contains apiKey, appId, projectId, firestoreDatabaseId). While Firebase client keys are not secret by themselves, committing configuration increases project exposure.
- Sensitive error data: Firestore error helpers include currentUser/providerData in thrown errors. These structured errors can expose PII (email, uid) if surfaced to users or logs. Recommend sanitizing client-facing errors and routing sensitive details to server-side telemetry only.
- Client-side uploads: Uploads (APK metadata and references) are written directly from the client to Firestore with no server-side validation or malware scanning in the provided code. This allows potential malicious uploads unless Firestore security rules and moderation are strict.
- Realtime listeners: Documents are delivered directly to clients via onSnapshot; ensure Firestore rules enforce least privilege.
Recommended immediate mitigations (evidence-based):
- Remove firebase-applet-config.json from source control or ensure strict Firestore rules are in place and documented.
- Stop throwing raw JSON with auth details; return sanitized error messages to the client and keep full details in server-side logs/telemetry.
- Introduce server-side validation/moderation and malware scanning for uploaded binaries (not present in this repo).
- Audit and codify Firestore security rules (firestore.rules is present; verify and tighten as necessary).

## Contributing
- Inspect missing files and build locally first. Relevant files to review: src/firebase.ts, src/pages/Upload.tsx, src/components/ErrorBoundary.tsx, firestore.rules, firebase-applet-config.json, vite.config.ts, package.json.
- Typical workflow: fork, implement fixes or missing components (e.g., Navbar, Card, mockData), run npm install and npm run dev, and open a pull request.
- The repository currently has no contributor guide, tests, or CI. Contributions that restore missing components, centralize error handling, and add basic tests or linting are high value.

(There is no license file explicitly evidenced in the supplied repository, so no license statement is included here.)

</details>

---

<p align="center"><sub>README motion system · visual layer by RepoSignal · implementation details remain project-specific</sub></p>

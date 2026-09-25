/**
 * Bundled demo catalog so the store is never empty before Firestore has listings.
 * - Apps are FICTIONAL. Their Trust Passports were produced by the real Sentinel engine from
 *   synthetic builds (scripts/build-demo-catalog.ts) — no ratings or download counts are invented.
 * - Websites are real, well-known free tools; their Link X-ray reports are computed live.
 */
import type { Passport } from './passport';
import passports from './demo-passports.json';
import type { AppListing, SiteListing } from './types';

const P = passports as unknown as Record<string, Passport>;
const at = (d: string) => new Date(d).toISOString();

const app = (a: Omit<AppListing, 'kind' | 'id' | 'screenshots' | 'developer_id' | 'demo' | 'tags'> & { tags?: string[] }): AppListing => ({
  kind: 'app',
  id: `demo-${a.slug}`,
  screenshots: [],
  developer_id: 'viczo-demo',
  demo: true,
  tags: a.tags ?? [],
  passport: P[a.slug],
  package_name: P[a.slug]?.package_name,
  version: P[a.slug]?.version_name ?? undefined,
  size_bytes: P[a.slug]?.size_bytes,
  ...a,
});

export const DEMO_APPS: AppListing[] = [
  app({ slug: 'orbit-notes', name: 'Orbit Notes', tagline: 'Encrypted notes that never leave your phone.', description: 'Orbit Notes keeps your notes in an encrypted on-device store unlocked with your fingerprint. No account, no cloud, no trackers.\n\nThis is a demo listing: the app is fictional, but its Trust Passport was produced by Sentinel from a real, signed build.', category: 'Productivity', tags: ['Offline', 'Encryption', 'No account'], developer_name: 'VICZO Labs (demo)', created_at: at('2026-08-30'), hue: 'ember', is_featured: true, download_url: '/samples/orbit-notes-demo.apk' }),
  app({ slug: 'quill-keyboard', name: 'Quill Keyboard', tagline: 'A keyboard with no internet permission at all.', description: 'Swipe typing, emoji search and themes — and no network access, so your keystrokes physically cannot leave the device.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Tools', tags: ['Keyboard', 'Offline'], developer_name: 'VICZO Labs (demo)', created_at: at('2026-08-12'), hue: 'fusion' }),
  app({ slug: 'lumen-reader', name: 'Lumen Reader', tagline: 'EPUB & PDF reader with a calm, distraction-free layout.', description: 'Night modes, typography controls and offline libraries. Uses Firebase Analytics and Crashlytics — Sentinel lists both so you can decide.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Books', tags: ['Reading', 'EPUB'], developer_name: 'Paperlight (demo)', created_at: at('2026-07-21'), hue: 'tide' }),
  app({ slug: 'tidepool-chat', name: 'Tidepool Chat', tagline: 'End-to-end encrypted chat for small groups.', description: 'Group chats, voice notes and disappearing messages with on-device encryption. Needs your contacts to find friends — Sentinel explains why that matters.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Communication', tags: ['Messaging', 'E2EE'], developer_name: 'Tidepool (demo)', created_at: at('2026-07-02'), hue: 'tide' }),
  app({ slug: 'pulsefit', name: 'PulseFit', tagline: 'Workout tracking with heart-rate sensors.', description: 'Tracks runs, rides and heart-rate zones via Bluetooth sensors. Includes three analytics/engagement SDKs, all listed in its passport.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Health', tags: ['Fitness', 'Bluetooth'], developer_name: 'Pulse Studio (demo)', created_at: at('2026-06-18'), hue: 'ember' }),
  app({ slug: 'novacam', name: 'NovaCam', tagline: 'Pro camera controls — paid for with ads.', description: 'Manual exposure, RAW capture and night mode. Ad-supported: Sentinel finds three advertising SDKs inside.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Photography', tags: ['Camera', 'RAW', 'Ads'], developer_name: 'Nova (demo)', created_at: at('2026-05-27'), hue: 'ember' }),
  app({ slug: 'pocket-ledger', name: 'Pocket Ledger', tagline: 'Auto-tracks spending by reading bank SMS.', description: 'Parses transaction SMS from your bank to build a budget automatically. Convenient — and it means the app can read every SMS, including OTPs. Sentinel flags this trade-off clearly.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Finance', tags: ['Budget', 'SMS'], developer_name: 'Ledgerly (demo)', created_at: at('2026-05-03'), hue: 'fusion' }),
  app({ slug: 'beacon-maps', name: 'Beacon Maps', tagline: 'Beta: offline maps with live location sharing.', description: 'An early beta build shared by its developer. Sentinel spots that it is a debug build signed with a debug key — a sign it never went through a release pipeline.\n\nDemo listing (fictional app, real Sentinel passport).', category: 'Navigation', tags: ['Maps', 'Beta'], developer_name: 'Beacon (demo)', created_at: at('2026-04-11'), hue: 'tide' }),
];

const site = (s: Omit<SiteListing, 'kind' | 'id' | 'screenshots' | 'developer_id' | 'demo'>): SiteListing => ({
  kind: 'site',
  id: `demo-${s.slug}`,
  screenshots: [],
  developer_id: 'viczo-demo',
  demo: true,
  ...s,
});

export const DEMO_SITES: SiteListing[] = [
  site({ slug: 'have-i-been-pwned', name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com', tagline: 'Check if your email or phone was in a data breach.', description: 'A free service that tells you whether your email address or phone number appears in known data breaches, so you know which passwords to change.', category: 'Security', tags: ['Breaches', 'Privacy'], tech_stack: ['Azure', 'Cloudflare'], developer_name: 'Troy Hunt', created_at: at('2026-08-01'), hue: 'tide', is_featured: true }),
  site({ slug: 'virustotal', name: 'VirusTotal', url: 'https://www.virustotal.com', tagline: 'Scan files and URLs with dozens of antivirus engines.', description: 'Upload a file or paste a link and VirusTotal checks it against many antivirus engines and URL blocklists. A good second opinion after a Sentinel X-ray (note: uploads are shared with security vendors).', category: 'Security', tags: ['Malware', 'URL scan'], developer_name: 'VirusTotal (Google)', created_at: at('2026-07-20'), hue: 'fusion' }),
  site({ slug: 'excalidraw', name: 'Excalidraw', url: 'https://excalidraw.com', tagline: 'Virtual whiteboard for hand-drawn-style diagrams.', description: 'An open-source whiteboard for sketching diagrams that feel hand-drawn, with real-time collaboration and end-to-end encrypted sharing.', category: 'Design', tags: ['Whiteboard', 'Open source'], tech_stack: ['React', 'TypeScript'], developer_name: 'Excalidraw', created_at: at('2026-07-08'), hue: 'fusion' }),
  site({ slug: 'photopea', name: 'Photopea', url: 'https://www.photopea.com', tagline: 'Advanced photo editor that runs in the browser.', description: 'Edit PSD, XCF, Sketch and raster images with layers, masks and filters — no install required.', category: 'Design', tags: ['Photo editing', 'PSD'], tech_stack: ['JavaScript', 'WebGL'], developer_name: 'Ivan Kutskir', created_at: at('2026-06-29'), hue: 'ember' }),
  site({ slug: 'squoosh', name: 'Squoosh', url: 'https://squoosh.app', tagline: 'Compress images right in your browser.', description: 'An image compression app from Google Chrome Labs that runs codecs locally via WebAssembly — your images are not uploaded.', category: 'Developer Tools', tags: ['Images', 'WebAssembly'], tech_stack: ['Preact', 'WebAssembly'], developer_name: 'Google Chrome Labs', created_at: at('2026-06-10'), hue: 'tide' }),
  site({ slug: 'regex101', name: 'regex101', url: 'https://regex101.com', tagline: 'Build, test and debug regular expressions.', description: 'An interactive regex tester with explanations, a match inspector and support for several regex flavours.', category: 'Developer Tools', tags: ['Regex', 'Debugging'], developer_name: 'regex101', created_at: at('2026-05-30'), hue: 'ember' }),
  site({ slug: 'can-i-use', name: 'Can I use', url: 'https://caniuse.com', tagline: 'Browser support tables for web features.', description: 'Up-to-date support tables for HTML, CSS and JavaScript features across desktop and mobile browsers.', category: 'Reference', tags: ['Browsers', 'Web platform'], developer_name: 'Alexis Deveria', created_at: at('2026-05-12'), hue: 'fusion' }),
  site({ slug: 'mdn', name: 'MDN Web Docs', url: 'https://developer.mozilla.org', tagline: 'Documentation for web technologies.', description: 'Reference and guides for HTML, CSS, JavaScript and Web APIs, maintained by Mozilla and the community.', category: 'Reference', tags: ['Docs', 'Learning'], developer_name: 'Mozilla', created_at: at('2026-04-28'), hue: 'tide' }),
  site({ slug: 'desmos', name: 'Desmos', url: 'https://www.desmos.com/calculator', tagline: 'A beautiful, free graphing calculator.', description: 'Plot functions, create sliders and explore math visually in the browser.', category: 'Education', tags: ['Math', 'Graphing'], developer_name: 'Desmos Studio', created_at: at('2026-04-02'), hue: 'ember' }),
  site({ slug: 'tldraw', name: 'tldraw', url: 'https://www.tldraw.com', tagline: 'A very good infinite-canvas whiteboard.', description: 'A collaborative whiteboard with a clean infinite canvas, also available as an SDK for developers.', category: 'Productivity', tags: ['Whiteboard', 'Canvas'], tech_stack: ['React', 'TypeScript'], developer_name: 'tldraw', created_at: at('2026-03-15'), hue: 'fusion' }),
];

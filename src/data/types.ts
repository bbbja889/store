import type { LinkPassport, Passport } from './passport';

export type Kind = 'app' | 'site';

interface Base {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  screenshots: string[];
  developer_id: string;
  developer_name?: string;
  rating_avg?: number;
  rating_count?: number;
  is_verified?: boolean;
  is_featured?: boolean;
  created_at: string;
  /** Present on bundled demo listings (not from Firestore). */
  demo?: boolean;
}

export interface AppListing extends Base {
  kind: 'app';
  icon_url?: string;
  /** https link to the publisher's download (GitHub release, own site…). */
  download_url?: string;
  apk_url?: string;
  package_name?: string;
  version?: string;
  min_android?: string;
  size_bytes?: number;
  downloads?: number;
  passport?: Passport;
  /** Accent used for procedural icons. */
  hue?: 'ember' | 'tide' | 'fusion';
}

export interface SiteListing extends Base {
  kind: 'site';
  url: string;
  thumbnail_url?: string;
  tech_stack?: string[];
  views?: number;
  link_report?: LinkPassport;
  hue?: 'ember' | 'tide' | 'fusion';
}

export type Listing = AppListing | SiteListing;

export const APP_CATEGORIES = ['Productivity', 'Photography', 'Health', 'Communication', 'Tools', 'Finance', 'Books', 'Navigation'] as const;
export const SITE_CATEGORIES = ['Design', 'Developer Tools', 'Security', 'Education', 'Productivity', 'Reference'] as const;

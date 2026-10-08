export type SourceType = "guardian" | "hn" | "reddit" | "rss";

export type SortMode = "latest" | "top";

export type DesignTheme = "broadsheet" | "nyt";

export interface Article {
  id: string;
  page: string;
  category?: string | null;
  source: string;
  title: string;
  url: string;
  thumbnail?: string | null;
  publishedAt?: string | null;
  fetchedAt?: string | null;
  /** Native engagement when available (HN points, Reddit score). */
  score?: number | null;
  /** Composite ranking score computed at serve time. */
  heat?: number;
  /** Short lede / description when the feed provides one. */
  summary?: string | null;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  enabled: boolean;
  custom?: boolean;
  config: Record<string, string>;
}

export interface Category {
  id: string;
  label: string;
  enabled: boolean;
  keywords: string[];
}

export interface Page {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  refreshIntervalMinutes?: number;
  sources: Source[];
  categories: Category[];
}

export interface AppSettings {
  /** Max article age in hours. 0 = show everything. */
  maxAgeHours: number;
  /** How articles are ordered on each page. */
  sortMode: SortMode;
  /** Visual design system. */
  designTheme: DesignTheme;
  /** Lookback window for the Latest stream, in hours (1–24). */
  latestWindowHours?: number;
}

export interface AppConfig {
  pages: Page[];
  settings?: AppSettings;
}

export interface GuardianConfig {
  apiKey?: string;
  section: string;
}

export interface HNConfig {
  topN?: number;
  minPoints?: number;
}

export interface RedditConfig {
  subreddit: string;
}

export interface RSSConfig {
  feedUrl: string;
}

export type SourceConfig = GuardianConfig | HNConfig | RedditConfig | RSSConfig;

export interface FetchResult {
  articles: Article[];
  error?: string;
  /** True when the origin answered 304 — content unchanged since our last fetch. */
  notModified?: boolean;
}

export interface SourceStatus {
  id: string;
  name: string;
  type: SourceType;
  ok: boolean;
  count: number;
  /** True when the origin answered 304 — feed unchanged, nothing re-fetched. */
  notModified?: boolean;
  error?: string;
}

export interface ArticlesResponse {
  page: string;
  articles: Article[];
  categories: Category[];
  stale: boolean;
  generatedAt: string;
  refreshIntervalMinutes: number;
  maxAgeHours: number;
  sortMode: SortMode;
  sourceStatus: SourceStatus[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type CategoryAction = "add" | "update" | "delete";
export type FeedAction = "add" | "update" | "delete";

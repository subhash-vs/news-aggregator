import { getCachedArticles, isCacheStale, pruneCache, upsertArticles } from "./cache";
import { SPECIAL_PAGE_IDS } from "./constants";
import { getMaxAgeHours, getPageConfig, getSortMode } from "./config";
import { excludeAds } from "./ads";
import { fetchFromSource } from "./fetchers";
import { excludeNonEnglish } from "./language";
import { rankArticles } from "./rank";
import { cleanText } from "@/lib/html";
import { mapWithConcurrency } from "@/lib/http";
import { categoryKeywordPatterns, textMatchesAnyKeyword } from "@/lib/keywords";
import type { Article, ArticlesResponse, Category, SortMode, SourceStatus } from "@/types";

/** Serve-time cleanup: drop Hindi headlines and ad/promo feed junk. */
function cleanFeedArticles(articles: Article[]): Article[] {
  return excludeAds(excludeNonEnglish(articles));
}

/** Prefer direct publisher URLs over Google News redirects. */
function urlQuality(article: Article): number {
  const u = (article.url || "").toLowerCase();
  if (!u) return 0;
  if (u.includes("news.google.com")) return 1;
  return 2;
}

function mergeArticles(a: Article, b: Article): Article {
  const [primary, secondary] = urlQuality(a) >= urlQuality(b) ? [a, b] : [b, a];
  const sources = new Set(
    `${primary.source} · ${secondary.source}`
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return {
    ...primary,
    title: primary.title || secondary.title,
    thumbnail: primary.thumbnail || secondary.thumbnail,
    summary: primary.summary || secondary.summary || null,
    score: Math.max(primary.score ?? 0, secondary.score ?? 0) || null,
    publishedAt: primary.publishedAt || secondary.publishedAt,
    source: [...sources].join(" · "),
  };
}

/**
 * Normalize a title for cross-source matching:
 * lowercase, strip publisher suffixes (" - CNN"), drop punctuation.
 */
function titleKey(article: Article): string {
  let t = cleanText(article.title).toLowerCase();

  // Google News often appends " - Publisher"
  t = t.replace(/\s+[-–—]\s+[^-–—]{2,40}$/u, "");

  // Drop common wire/live prefixes noise
  t = t.replace(/^(live updates?|breaking|update)s?:\s*/i, "");

  t = t
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Require a meaningful length so short titles don't collide
  if (t.length < 18) return "";
  return t;
}

function articleIdentity(article: Article): string {
  return `${article.source}:${article.id}:${article.url}`;
}

function sourcePartCount(article: Article): number {
  return article.source.split("·").filter((s) => s.trim()).length;
}

/** Rewrite every URL slot that still points at a pre-merge article. */
function rekeyAll(byUrl: Map<string, Article>, targets: Article[], replacement: Article): void {
  const targetSet = new Set(targets);
  for (const [key, value] of byUrl) {
    if (targetSet.has(value)) byUrl.set(key, replacement);
  }
}

export function dedupeArticles(articles: Article[]): Article[] {
  const byUrl = new Map<string, Article>();
  const byTitle = new Map<string, Article>();
  const order: string[] = [];

  const remember = (key: string, article: Article) => {
    if (!byUrl.has(key)) order.push(key);
    byUrl.set(key, article);
  };

  // Pass 1: exact URL
  for (const article of articles) {
    const urlKey = (article.url || article.id).trim().toLowerCase();
    if (!urlKey) continue;
    const existing = byUrl.get(urlKey);
    if (!existing) {
      remember(urlKey, article);
      continue;
    }
    const merged = mergeArticles(existing, article);
    rekeyAll(byUrl, [existing, article], merged);
    remember(urlKey, merged);
  }

  // Pass 2: same headline across Google News + publisher RSS.
  // Snapshot values: rekeyAll mutates byUrl while we walk the list.
  for (const article of [...byUrl.values()]) {
    const tKey = titleKey(article);
    if (!tKey) continue;

    const existing = byTitle.get(tKey);
    if (!existing) {
      byTitle.set(tKey, article);
      continue;
    }

    const merged = mergeArticles(existing, article);
    byTitle.set(tKey, merged);
    // Chained merges must retarget every stale slot, not just the two URLs
    // we happened to remember — otherwise superseded objects leak into the
    // final list with identical source:id:url and break React keys.
    rekeyAll(byUrl, [existing, article, merged], merged);
  }

  // Collapse any remaining duplicate identities (stale slots, re-merges).
  // Prefer the most complete merge (more combined source desks).
  const byIdentity = new Map<string, Article>();
  for (const key of order) {
    const article = byUrl.get(key);
    if (!article) continue;
    const id = articleIdentity(article);
    const prev = byIdentity.get(id);
    if (!prev || sourcePartCount(article) >= sourcePartCount(prev)) {
      byIdentity.set(id, article);
    }
  }

  return [...byIdentity.values()];
}

function filterByAge(articles: Article[], maxAgeHours: number): Article[] {
  if (!maxAgeHours || maxAgeHours <= 0) return articles;
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  return articles.filter((article) => {
    if (!article.publishedAt) return false;
    const t = Date.parse(article.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
}

function matchCategory(article: Article, categories: Category[]): string | null {
  const text = `${article.title} ${article.source}`.toLowerCase();
  for (const category of categories) {
    if (!category.enabled) continue;
    if (textMatchesAnyKeyword(text, categoryKeywordPatterns(category))) {
      return category.id;
    }
  }
  return null;
}

function emptyResponse(
  pageId: string,
  sourceStatus: SourceStatus[] = [],
  maxAgeHours = 24,
  sortMode: SortMode = "latest"
): ArticlesResponse {
  return {
    page: pageId,
    articles: [],
    categories: [],
    stale: false,
    generatedAt: new Date().toISOString(),
    refreshIntervalMinutes: 0,
    maxAgeHours,
    sortMode,
    sourceStatus,
  };
}

/**
 * Fetch every enabled source for a page — only 2 at a time so the 512MB VM
 * never opens a flood of sockets — then store results and prune.
 * Bounded by per-source fetch timeouts (~8-10s worst case each).
 */
async function fetchAndStore(pageId: string): Promise<SourceStatus[]> {
  const page = getPageConfig(pageId);
  if (!page || SPECIAL_PAGE_IDS.has(pageId)) return [];

  const enabledSources = page.sources.filter((s) => s.enabled);
  const results = await mapWithConcurrency(enabledSources, 2, async (source) => {
    const result = await fetchFromSource(source, pageId);
    return { source, result };
  });

  const unfiltered = results.flatMap(({ result }) => result.articles);
  if (unfiltered.length > 0) {
    upsertArticles(pageId, unfiltered);
    pruneCache();
  }

  return results.map(({ source, result }) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    ok: !result.error,
    count: result.articles.length,
    error: result.error,
  }));
}

/** Pages with a refresh already in flight (dedup guard for background work). */
const backgroundRefreshes = new Set<string>();

/**
 * Refresh a page in the background without blocking any response.
 * Deduped per page so repeated stale hits don't stack fetches.
 */
export function refreshPageInBackground(pageId: string): Promise<void> {
  if (backgroundRefreshes.has(pageId)) return Promise.resolve();
  backgroundRefreshes.add(pageId);
  return fetchAndStore(pageId)
    .then(() => undefined)
    .catch((error) => {
      console.error(`[articles] Background refresh failed for ${pageId}:`, error);
    })
    .finally(() => {
      backgroundRefreshes.delete(pageId);
    });
}

export async function getArticlesForPage(
  pageId: string,
  options?: { force?: boolean }
): Promise<ArticlesResponse> {
  const maxAgeHours = getMaxAgeHours();
  const sortMode = getSortMode();
  const page = getPageConfig(pageId);
  if (!page || SPECIAL_PAGE_IDS.has(pageId)) {
    return emptyResponse(pageId, [], maxAgeHours, sortMode);
  }

  const buildResponse = (
    articles: Article[],
    stale: boolean,
    sourceStatus: SourceStatus[],
    generatedAt?: string
  ): ArticlesResponse => {
    const categories = page.categories.filter((c) => c.enabled);
    const withCategories = cleanFeedArticles(dedupeArticles(articles)).map((article) => ({
      ...article,
      category: article.category ?? matchCategory(article, categories),
    }));
    return {
      page: pageId,
      articles: rankArticles(filterByAge(withCategories, maxAgeHours), sortMode),
      categories,
      stale,
      generatedAt: generatedAt ?? new Date().toISOString(),
      refreshIntervalMinutes: page.refreshIntervalMinutes ?? 0,
      maxAgeHours,
      sortMode,
      sourceStatus,
    };
  };

  const cached = filterByAge(getCachedArticles(pageId), maxAgeHours);
  const cacheFresh = cached.length > 0 && !isCacheStale(pageId);

  if (cacheFresh && !options?.force) {
    return buildResponse(cached, false, [], cached[0]?.fetchedAt ?? undefined);
  }

  // Stale-but-present: serve immediately. The route schedules a background
  // refresh via after(); the client polls and picks up fresh data shortly.
  if (cached.length > 0 && !options?.force) {
    return buildResponse(cached, true, [], cached[0]?.fetchedAt ?? undefined);
  }

  // Cold start (empty cache) or explicit refresh: block while fetching.
  // Sources are sequenced (2 at a time) and each has a hard timeout, so the
  // worst case is bounded — no more minute-long hangs.
  const sourceStatus = await fetchAndStore(pageId);
  const fresh = filterByAge(getCachedArticles(pageId), maxAgeHours);
  return buildResponse(fresh, sourceStatus.some((s) => !s.ok), sourceStatus);
}

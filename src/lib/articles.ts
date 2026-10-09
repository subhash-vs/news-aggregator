import { getCachedArticles, getNewestFetchedAt, pruneCache, upsertArticles, DEFAULT_MAX_AGE_MINUTES } from "./cache";
import { SPECIAL_PAGE_IDS } from "./constants";
import { getMaxAgeHours, getPageConfig, getSortMode } from "./config";
import { excludeAds } from "./ads";
import { fetchFromSource } from "./fetchers";
import { enqueueFetch, isFeedCooledOff, recordFeedFailure, recordFeedSuccess } from "./feed-queue";
import { excludeNonEnglish } from "./language";
import { rankArticles } from "./rank";
import { cleanText } from "@/lib/html";
import { mapWithConcurrency } from "@/lib/http";
import { categoryKeywordPatterns, textMatchesAnyKeyword } from "@/lib/keywords";
import { onConfigRawChanged } from "./seed";
import { touchArticlesFetchedAt } from "./db";
import { ResponseCache, timeBucket } from "./response-cache";
import type { Article, ArticlesResponse, Category, Page, SortMode, SourceStatus } from "@/types";

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

/** Most recent of two ISO timestamps (either may be null/invalid). */
function newerIso(a?: string | null, b?: string | null): string | null {
  const at = a ? Date.parse(a) : NaN;
  const bt = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(at)) return b ?? null;
  if (!Number.isFinite(bt)) return a ?? null;
  return at >= bt ? a! : b!;
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
    // Take the newer timestamp so an evergreen re-tease merge (below) shows
    // the latest revision regardless of which variant arrived first.
    publishedAt: newerIso(primary.publishedAt, secondary.publishedAt),
    source: [...sources].join(" · "),
  };
}

/**
 * Evergreen pages that republish under a rotating headline. The Economist's
 * "World in Brief" is the archetype: one page, re-teased throughout the day
 * ("World in Brief: <lead brief>; <rotating brief>"), and Google News
 * indexes each re-tease as a separate article with its own URL. Both dedupe
 * passes then see N distinct articles (distinct URLs, distinct full titles),
 * so the story shows up on the page once per live revision. Keying on the
 * fixed series prefix collapses them into a single card. Add entries as
 * other rotating evergreen feeds appear.
 */
const EVERGREEN_SERIES = new Set(["world in brief"]);

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

  // Rotating evergreen series: the text before the series colon is the real
  // identity; everything after it is today's tease. Checked before punctuation
  // stripping because the colon is what delimits the series name.
  const series = /^([a-z0-9\s'’]{3,40}):/.exec(t)?.[1]?.trim() ?? "";
  if (EVERGREEN_SERIES.has(series)) {
    // The series key is short by construction — skip the length guard below.
    return series;
  }

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
    if (isFeedCooledOff(`page:${pageId}:${source.id}`)) {
      return {
        source,
        result: { articles: [], error: "Cooling down after repeated failures" },
      };
    }
    const result = await fetchFromSource(source, pageId);
    if (result.error) {
      recordFeedFailure(`page:${pageId}:${source.id}`);
    } else {
      // 304 Not Modified counts as success — the feed answered, it's just unchanged.
      recordFeedSuccess(`page:${pageId}:${source.id}`);
    }
    return { source, result };
  });

  const unfiltered = results.flatMap(({ result }) => result.articles);
  if (unfiltered.length > 0) {
    upsertArticles(pageId, unfiltered);
    pruneCache();
  }

  // 304 Not Modified: no new articles, but the page's staleness clock must
  // reset for EVERY fetcher type. fetchRSS used to do this itself; the
  // Guardian path returned notModified without touching fetchedAt, so a
  // Guardian-only page never looked fresh and re-polled forever. Doing it
  // here (once, centrally) covers RSS, Guardian, and any future fetcher.
  for (const { source, result } of results) {
    if (result.notModified) {
      touchArticlesFetchedAt(pageId, source.name);
    }
  }

  return results.map(({ source, result }) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    ok: !result.error,
    count: result.articles.length,
    notModified: result.notModified,
    error: result.error,
  }));
}

/** Last completed refresh statuses per page (shared across deduped callers). */
const lastStatuses = new Map<string, SourceStatus[]>();

/**
 * Refresh a page through the global fetch queue (max 3 concurrent across the
 * whole app, deduped per page, per-feed circuit breaker). Returns the source
 * statuses once the queued run completes; concurrent callers share one run.
 */
export function refreshPageInBackground(pageId: string): Promise<SourceStatus[]> {
  const run = enqueueFetch(`page:${pageId}`, async () => {
    lastStatuses.set(pageId, await fetchAndStore(pageId));
  });
  return run.then(() => lastStatuses.get(pageId) ?? []);
}

/**
 * In-process cache of the expensive serve-time pipeline (dedupe → categorize
 * → age-filter → rank). Keyed on everything that changes its output: page,
 * newest fetchedAt (any fetch/touch moves it), sort/maxAge config, enabled
 * category ids, and a 5-min time bucket (age filters drift with the clock).
 * The volatile fields (stale flag, generatedAt) are recomputed per request so
 * a cached "fresh" response can never mask newly-stale data. Config saves
 * drop the whole cache via onConfigRawChanged.
 */
const pipelineCache = new ResponseCache<{ articles: Article[]; categories: Category[] }>(32);
onConfigRawChanged(() => pipelineCache.clear());

const PIPELINE_BUCKET_MS = 5 * 60 * 1000;

function pipelineKey(
  pageId: string,
  newest: number,
  sortMode: SortMode,
  maxAgeHours: number,
  page: Page
): string {
  const catSig = page.categories
    .filter((c) => c.enabled)
    .map((c) => c.id)
    .join(",");
  return `${pageId}|${newest}|${sortMode}|${maxAgeHours}|${catSig}|${timeBucket(PIPELINE_BUCKET_MS)}`;
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

  /** Expensive part: clean → dedupe → categorize → filter by age → rank. */
  const buildPipeline = (
    articles: Article[]
  ): { articles: Article[]; categories: Category[] } => {
    const categories = page.categories.filter((c) => c.enabled);
    const withCategories = cleanFeedArticles(dedupeArticles(articles)).map((article) => ({
      ...article,
      category: article.category ?? matchCategory(article, categories),
    }));
    return {
      articles: rankArticles(filterByAge(withCategories, maxAgeHours), sortMode),
      categories,
    };
  };

  const buildResponse = (
    pipeline: { articles: Article[]; categories: Category[] },
    stale: boolean,
    sourceStatus: SourceStatus[],
    generatedAt?: string
  ): ArticlesResponse => ({
    page: pageId,
    articles: pipeline.articles,
    categories: pipeline.categories,
    stale,
    generatedAt: generatedAt ?? new Date().toISOString(),
    refreshIntervalMinutes: page.refreshIntervalMinutes ?? 0,
    maxAgeHours,
    sortMode,
    sourceStatus,
  });

  const newest = getNewestFetchedAt(pageId);
  const key = pipelineKey(pageId, newest, sortMode, maxAgeHours, page);
  const stale = !newest || Date.now() - newest > DEFAULT_MAX_AGE_MINUTES * 60 * 1000;

  // Cache hit: skip the DB read + dedupe + rank entirely. stale/generatedAt
  // are recomputed above so time passing can't serve a stale-fresh response.
  if (!options?.force) {
    const hit = pipelineCache.get(key);
    if (hit) {
      if (stale) void refreshPageInBackground(pageId).catch(() => {});
      return buildResponse(hit, stale, [], new Date().toISOString());
    }
  }

  const cached = filterByAge(getCachedArticles(pageId), maxAgeHours);
  const cacheFresh = cached.length > 0 && !stale;

  if (cacheFresh && !options?.force) {
    const pipeline = buildPipeline(cached);
    pipelineCache.set(key, pipeline);
    return buildResponse(pipeline, false, [], cached[0]?.fetchedAt ?? undefined);
  }

  // Stale-but-present: serve immediately and refresh through the queue in the
  // background. The client polls and picks up fresh data shortly.
  if (cached.length > 0 && !options?.force) {
    void refreshPageInBackground(pageId).catch(() => {});
    const pipeline = buildPipeline(cached);
    pipelineCache.set(key, pipeline);
    return buildResponse(pipeline, true, [], cached[0]?.fetchedAt ?? undefined);
  }

  // Cold start (empty cache) or explicit refresh: enqueue through the global
  // fetch queue and await the result. The queue caps concurrency app-wide, so
  // even simultaneous cold starts across pages can't storm the VM — and the
  // HTTP layer still bounds every individual source fetch.
  const sourceStatus = await refreshPageInBackground(pageId);
  const fresh = filterByAge(getCachedArticles(pageId), maxAgeHours);
  const pipeline = buildPipeline(fresh);
  // Populate the cache under the post-fetch key so the next read hits warm.
  pipelineCache.set(
    pipelineKey(pageId, getNewestFetchedAt(pageId), sortMode, maxAgeHours, page),
    pipeline
  );
  return buildResponse(pipeline, sourceStatus.some((s) => !s.ok), sourceStatus);
}

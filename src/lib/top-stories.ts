import { dedupeArticles } from "./articles";
import { excludeAds } from "./ads";
import { getGlobalNewestFetchedAt, getCachedArticles } from "./cache";
import { SPECIAL_PAGE_IDS } from "./constants";
import { getEnabledPages, getMaxAgeHours, getSortMode } from "./config";
import { onConfigRawChanged } from "./seed";
import { excludeNonEnglish } from "./language";
import { rankArticles } from "./rank";
import { ResponseCache, timeBucket } from "./response-cache";
import type { Article } from "@/types";

function cleanFeedArticles(articles: Article[]): Article[] {
  return excludeAds(excludeNonEnglish(articles));
}

const TOP_PER_PAGE = 8;
const MAX_TOP_TOTAL = 36;

/**
 * Response cache for the cross-page Top pipeline — it re-reads EVERY enabled
 * page's articles and runs dedupe + rank twice per request. Keyed on the
 * global newest fetchedAt (any page's fetch invalidates), the maxAge config,
 * and a 5-min time bucket for age-filter drift.
 */
const topCache = new ResponseCache<Article[]>(8);
onConfigRawChanged(() => topCache.clear());
const TOP_BUCKET_MS = 5 * 60 * 1000;

/**
 * Cross-page Top Stories: best-ranked articles from each enabled page,
 * using heat ranking (engagement + recency + source weight).
 */
export function getTopStories(limitPerSourcePage = TOP_PER_PAGE): Article[] {
  const maxAgeHours = getMaxAgeHours();
  const key = `top|${limitPerSourcePage}|${maxAgeHours}|${getGlobalNewestFetchedAt()}|${timeBucket(TOP_BUCKET_MS)}`;
  const hit = topCache.get(key);
  if (hit) return hit;

  const cutoff = maxAgeHours > 0 ? Date.now() - maxAgeHours * 60 * 60 * 1000 : 0;

  const pageIds = getEnabledPages()
    .map((p) => p.id)
    .filter((id) => !SPECIAL_PAGE_IDS.has(id));

  const buckets: Article[] = [];

  for (const pageId of pageIds) {
    const cached = getCachedArticles(pageId);
    if (cached.length === 0) continue;

    const fresh = cached.filter((a) => {
      if (!cutoff || !a.publishedAt) return !!a.publishedAt;
      const t = Date.parse(a.publishedAt);
      return Number.isFinite(t) && t >= cutoff;
    });

    const pool = fresh.length > 0 ? fresh : cached;
    const ranked = rankArticles(cleanFeedArticles(dedupeArticles(pool)), "top").slice(0, limitPerSourcePage);
    buckets.push(...ranked);
  }

  // Global re-rank so heat scores are comparable across pages
  const result = rankArticles(cleanFeedArticles(dedupeArticles(buckets)), "top").slice(0, MAX_TOP_TOTAL);
  topCache.set(key, result);
  return result;
}

export function getTopStoriesByPage(pageId: string, limit = 10): Article[] {
  const maxAgeHours = getMaxAgeHours();
  const sortMode = getSortMode();
  void sortMode;
  const cached = getCachedArticles(pageId);
  const cutoff = maxAgeHours > 0 ? Date.now() - maxAgeHours * 60 * 60 * 1000 : 0;
  const pool = cutoff
    ? cached.filter((a) => {
        if (!a.publishedAt) return false;
        const t = Date.parse(a.publishedAt);
        return Number.isFinite(t) && t >= cutoff;
      })
    : cached;
  return rankArticles(cleanFeedArticles(dedupeArticles(pool.length ? pool : cached)), "top").slice(0, limit);
}

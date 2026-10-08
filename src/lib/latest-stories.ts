import { dedupeArticles } from "./articles";
import { excludeAds } from "./ads";
import { getGlobalNewestFetchedAt, getCachedArticles } from "./cache";
import { LATEST_WINDOW_HOURS, SPECIAL_PAGE_IDS } from "./constants";
import { getEnabledPages } from "./config";
import { onConfigRawChanged } from "./seed";
import { excludeNonEnglish } from "./language";
import { ResponseCache, timeBucket } from "./response-cache";
import type { Article } from "@/types";

export { LATEST_WINDOW_HOURS };

const DEFAULT_LIMIT = 60;

/** Max stories each page can contribute to Latest — keeps one section from flooding the feed. */
const PER_PAGE_CAP = 15;

/** Latest is a hard-news stream — skip sports desks and entertainment. */
const EXCLUDED_PAGES = new Set(["sports", "movies"]);

const EXCLUDED_CATEGORIES = new Set([
  "cricket",
  "f1",
  "football",
  "hollywood",
  "bollywood",
  "india-cricket",
]);

/** High-confidence sports/cinema cues in headlines from mixed sections. */
const SPORTS_CINEMA_HEADLINE =
  /\b(cricket|iplt?|bcci|test match|odi|t20|wicket|batsman|bowler|football|soccer|premier league|la liga|uefa|fifa|formula 1|f1|grand prix|box office|bollywood|hollywood|kollywood|tollywood|filmfare|movie|cinema|trailer|netflix series|web series)\b/i;

function cleanFeedArticles(articles: Article[]): Article[] {
  return excludeAds(excludeNonEnglish(articles));
}

function isSportsOrCinema(article: Article): boolean {
  if (EXCLUDED_PAGES.has(article.page)) return true;
  if (article.category && EXCLUDED_CATEGORIES.has(article.category)) return true;
  return SPORTS_CINEMA_HEADLINE.test(article.title || "");
}

function pageIds(): string[] {
  return getEnabledPages()
    .map((p) => p.id)
    .filter((id) => !SPECIAL_PAGE_IDS.has(id) && !EXCLUDED_PAGES.has(id));
}

/**
 * Response cache for the Latest pipeline — same cost profile as Top (every
 * page's articles re-read, filtered, deduped, re-sorted per request).
 */
const latestCache = new ResponseCache<Article[]>(8);
onConfigRawChanged(() => latestCache.clear());
const LATEST_BUCKET_MS = 5 * 60 * 1000;

/**
 * Newest-first stories from every enabled page, limited to a short window
 * (default: last 2 hours) based on publishedAt. Sports and cinema are omitted.
 */
export function getLatestStories(options?: { hours?: number; limit?: number }): Article[] {
  const hours = options?.hours ?? LATEST_WINDOW_HOURS;
  const limit = options?.limit ?? DEFAULT_LIMIT;

  const key = `latest|${hours}|${limit}|${getGlobalNewestFetchedAt()}|${timeBucket(LATEST_BUCKET_MS)}`;
  const hit = latestCache.get(key);
  if (hit) return hit;

  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  const pooled: Article[] = [];
  for (const pageId of pageIds()) {
    const cached = getCachedArticles(pageId);
    // Keep only the most recent articles per page so high-volume feeds (e.g. India)
    // don't dominate the Latest stream.
    const recentFromPage = cached
      .filter((a) => {
        if (!a.publishedAt) return false;
        const t = Date.parse(a.publishedAt);
        return Number.isFinite(t) && t >= cutoff;
      })
      .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
      .slice(0, PER_PAGE_CAP);
    pooled.push(...recentFromPage);
  }

  const recent = pooled.filter((a) => !isSportsOrCinema(a));

  const cleaned = cleanFeedArticles(dedupeArticles(recent));
  const result = cleaned
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
    .slice(0, limit);
  latestCache.set(key, result);
  return result;
}

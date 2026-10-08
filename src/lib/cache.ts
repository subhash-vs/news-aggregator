import { db, getArticlesByPage, getGlobalNewestFetchedAtRaw, getNewestFetchedAtRaw, pruneArticles, upsertArticle } from "./db";
import type { Article } from "@/types";

const DEFAULT_MAX_AGE_MINUTES = 30;

export function getCachedArticles(page: string): Article[] {
  try {
    return getArticlesByPage(page);
  } catch (error) {
    console.error(`[cache] Failed to read articles for ${page}:`, error);
    return [];
  }
}

export function upsertArticles(page: string, articles: Article[]): void {
  try {
    const run = db.transaction((items: Article[]) => {
      for (const article of items) {
        upsertArticle({ ...article, page: article.page || page });
      }
    });
    run(articles);
  } catch (error) {
    console.error(`[cache] Failed to upsert articles for ${page}:`, error);
  }
}

/**
 * Prune throttle: the DELETE passes over the articles table are the most
 * expensive writes we do, and there is no value in running them after every
 * single fetch — the table is retention-bounded (24h) either way. Once per
 * 10 minutes keeps the table from growing between prune windows while
 * removing prune work from the fetch hot path.
 */
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let lastPruneAt = 0;

/** Keep the articles table bounded after writing fresh fetch results. */
export function pruneCache(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  try {
    pruneArticles();
  } catch (error) {
    console.error("[cache] Failed to prune articles:", error);
  }
}

export function getNewestFetchedAt(page: string): number {
  try {
    const newest = getNewestFetchedAtRaw(page);
    if (!newest) return 0;
    const t = Date.parse(newest);
    return Number.isFinite(t) ? t : 0;
  } catch (error) {
    console.error(`[cache] Failed to read newest fetchedAt for ${page}:`, error);
    return 0;
  }
}

/**
 * Newest fetched_at across ALL pages — one aggregate instead of N per-page
 * reads. Used as a cache-key component for cross-page pipelines (Top/Latest)
 * so any page's fresh fetch invalidates their cached responses.
 */
export function getGlobalNewestFetchedAt(): number {
  try {
    const newest = getGlobalNewestFetchedAtRaw();
    if (!newest) return 0;
    const t = Date.parse(newest);
    return Number.isFinite(t) ? t : 0;
  } catch (error) {
    console.error("[cache] Failed to read global newest fetchedAt:", error);
    return 0;
  }
}

export function isCacheStale(page: string, maxAgeMinutes = DEFAULT_MAX_AGE_MINUTES): boolean {
  // Single aggregate over the (page, fetched_at) index instead of loading
  // every article row just to find the max timestamp.
  const newest = getNewestFetchedAt(page);
  if (!newest) return true;
  return Date.now() - newest > maxAgeMinutes * 60 * 1000;
}

export { DEFAULT_MAX_AGE_MINUTES };

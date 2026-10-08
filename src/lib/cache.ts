import { db, getArticlesByPage, pruneArticles, upsertArticle } from "./db";
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

/** Keep the articles table bounded after writing fresh fetch results. */
export function pruneCache(): void {
  try {
    pruneArticles();
  } catch (error) {
    console.error("[cache] Failed to prune articles:", error);
  }
}

export function getNewestFetchedAt(page: string): number {
  try {
    const row = db
      .prepare("SELECT MAX(fetched_at) AS newest FROM articles WHERE page = ?")
      .get(page) as { newest: string | null };
    if (!row?.newest) return 0;
    const t = Date.parse(row.newest);
    return Number.isFinite(t) ? t : 0;
  } catch (error) {
    console.error(`[cache] Failed to read newest fetchedAt for ${page}:`, error);
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

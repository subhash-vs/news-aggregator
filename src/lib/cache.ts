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

export function isCacheStale(page: string, maxAgeMinutes = DEFAULT_MAX_AGE_MINUTES): boolean {
  const articles = getCachedArticles(page);
  if (articles.length === 0) return true;

  const newest = articles.reduce((max, article) => {
    const t = article.fetchedAt ? Date.parse(article.fetchedAt) : 0;
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);

  if (!newest) return true;
  return Date.now() - newest > maxAgeMinutes * 60 * 1000;
}

export { DEFAULT_MAX_AGE_MINUTES };

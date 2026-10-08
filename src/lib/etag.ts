import { createHash } from "node:crypto";
import type { Article, ArticlesResponse } from "@/types";

/**
 * Weak ETag over the stable parts of an articles payload (ids + fetchedAt +
 * flags). generatedAt is deliberately excluded — it changes every request and
 * would make the ETag useless. If an article's content changed, its fetchedAt
 * changed, so the hash changes.
 *
 * Shared by /api/articles and /api/articles/refresh so the client's
 * If-None-Match survives an explicit refresh without a wasted full response.
 */
export function articlesEtag(data: ArticlesResponse): string {
  const h = createHash("sha1");
  h.update(data.page);
  h.update(data.stale ? "1" : "0");
  h.update(data.sortMode);
  h.update(String(data.maxAgeHours));
  for (const a of data.articles) {
    h.update(a.id);
    h.update("|");
    h.update(a.fetchedAt ?? "");
    h.update(";");
  }
  return `W/"${h.digest("hex")}"`;
}

function hashArticles(h: ReturnType<typeof createHash>, articles: Article[]): void {
  for (const a of articles) {
    h.update(a.id);
    h.update("|");
    h.update(a.fetchedAt ?? a.publishedAt ?? "");
    h.update(";");
  }
}

/**
 * Weak ETag for /api/top — covers the heat-ranked picks, every publisher
 * feed's cached tops (id + fetched_at + article ids), the page list, and the
 * config knobs that shape the response. generatedAt excluded.
 */
export function topStoriesEtag(data: {
  articles: Article[];
  sourceTops: Array<{ feed: { id: string }; articles: Article[]; fetchedAt?: string }>;
  pages: Array<{ id: string; label: string }>;
  maxAgeHours: number;
  sortMode: string;
}): string {
  const h = createHash("sha1");
  h.update(`top|${data.maxAgeHours}|${data.sortMode}`);
  for (const p of data.pages) {
    h.update(p.id);
    h.update("~");
  }
  hashArticles(h, data.articles);
  for (const t of data.sourceTops) {
    h.update(t.feed.id);
    h.update("@");
    h.update(t.fetchedAt ?? "");
    h.update("[");
    hashArticles(h, t.articles);
    h.update("]");
  }
  return `W/"${h.digest("hex")}"`;
}

/**
 * Weak ETag for /api/latest — article ids + timestamps, window size, and the
 * page list. generatedAt excluded.
 */
export function latestStoriesEtag(data: {
  articles: Article[];
  windowHours: number;
  pages: Array<{ id: string; label: string }>;
}): string {
  const h = createHash("sha1");
  h.update(`latest|${data.windowHours}`);
  for (const p of data.pages) {
    h.update(p.id);
    h.update("~");
  }
  hashArticles(h, data.articles);
  return `W/"${h.digest("hex")}"`;
}

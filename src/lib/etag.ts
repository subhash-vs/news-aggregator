import { createHash } from "node:crypto";
import type { ArticlesResponse } from "@/types";

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

import { excludeAds } from "./ads";
import { getCachedArticles } from "./cache";
import { dedupeArticles } from "./articles";
import { getEnabledPages } from "./config";
import { excludeNonEnglish } from "./language";
import { normalizeText, textMatchesTokens, tokenize } from "./search";
import type { Article } from "@/types";

/**
 * Global (cross-page) title search over the cached article set — Stage 2 of
 * docs/SEARCH-DESIGN.md. Server-only: it reads SQLite through the cache
 * layer, so it lives apart from lib/search.ts to keep the pure matcher
 * client-safe. The table is retention-pruned and small, so matching runs in
 * memory — no LIKE query, no FTS5 index.
 */

export interface GlobalSearchMatches {
  /** Top matches, ranked and capped at `limit`. */
  articles: Article[];
  /** Every match before the limit. */
  total: number;
}

/**
 * Match quality: the whole phrase in the title beats every token appearing
 * as a standalone word, which beats a bare substring hit ("iran" inside
 * "transit").
 */
function rankOf(title: string, tokens: string[], phrase: string): number {
  const normalized = normalizeText(title);
  if (tokens.length > 1 && normalized.includes(phrase)) return 3;
  const words = normalized.split(" ");
  const allAsWords = tokens.every((token) =>
    words.some((word) => word === token || word.startsWith(token))
  );
  return allAsWords ? 2 : 1;
}

export function searchAllCachedArticles(
  rawQuery: string,
  limit: number
): GlobalSearchMatches {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return { articles: [], total: 0 };
  const phrase = normalizeText(rawQuery);

  // Pool every enabled page's cached articles, keyed by URL so the same
  // story filed under two pages is only ranked once. dedupeArticles then
  // still merges cross-source variants (same headline, different URLs).
  const seen = new Set<string>();
  const pooled: Article[] = [];
  for (const page of getEnabledPages()) {
    for (const article of getCachedArticles(page.id)) {
      const key = (article.url || article.id).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pooled.push(article);
    }
  }

  const cleaned = dedupeArticles(excludeAds(excludeNonEnglish(pooled)));

  const matched: Array<{ article: Article; rank: number }> = [];
  for (const article of cleaned) {
    if (!textMatchesTokens(article.title, tokens)) continue;
    matched.push({ article, rank: rankOf(article.title, tokens, phrase) });
  }

  // Best match first; newest within the same rank; heat breaks remaining ties.
  matched.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    const at = Date.parse(a.article.publishedAt ?? "") || 0;
    const bt = Date.parse(b.article.publishedAt ?? "") || 0;
    if (bt !== at) return bt - at;
    return (b.article.heat ?? 0) - (a.article.heat ?? 0);
  });

  return {
    articles: matched.slice(0, limit).map((m) => m.article),
    total: matched.length,
  };
}

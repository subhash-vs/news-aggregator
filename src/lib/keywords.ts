import type { Category } from "@/types";

/** Escape regex metacharacters so keyword literals match literally. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cache compiled keyword patterns per category to avoid recompiling per article. */
const keywordPatternCache = new Map<string, RegExp[]>();

export function categoryKeywordPatterns(category: Category): RegExp[] {
  const cacheKey = `${category.id}:${category.keywords.join("\u0000")}`;
  const cached = keywordPatternCache.get(cacheKey);
  if (cached) return cached;

  const patterns = category.keywords
    .filter((k) => k.trim().length > 0)
    .map((k) => new RegExp(`\\b${escapeRegExp(k.trim())}\\b`, "i"));

  keywordPatternCache.set(cacheKey, patterns);
  return patterns;
}

export function textMatchesAnyKeyword(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

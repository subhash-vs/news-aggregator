import type { Article } from "@/types";

/**
 * Title search — pure matching helpers shared by the page filter (Stage 1)
 * and, later, the global search endpoint (Stage 2). No I/O, no React.
 *
 * Semantics: normalize → tokenize → AND-match. Every token must appear in
 * the title. Quoted phrases stay whole ("climate change" = one token).
 */

/** Lowercase, strip punctuation to spaces, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens shorter than this are noise ("a", "of") unless it's all we have. */
const MIN_TOKEN_LENGTH = 2;

/**
 * Split a raw query into match tokens. Extracts quoted phrases first (they
 * survive normalization as a single token), then splits the remainder into
 * words. Words shorter than MIN_TOKEN_LENGTH are dropped — unless nothing
 * survives, in which case the whole normalized query is used as-is so a
 * 1–2 character query ("ai", "x") still searches.
 */
export function tokenize(query: string): string[] {
  const phrases: string[] = [];
  const rest = query.replace(/"([^"]+)"|“([^”]+)”/g, (_match, double, curly) => {
    const phrase = normalizeText(double ?? curly ?? "");
    if (phrase) phrases.push(phrase);
    return " ";
  });

  const words = normalizeText(rest)
    .split(" ")
    .filter((word) => word.length >= MIN_TOKEN_LENGTH);

  const tokens = [...new Set([...phrases, ...words])];
  if (tokens.length === 0) {
    const whole = normalizeText(query);
    if (whole) tokens.push(whole);
  }
  return tokens;
}

/** True when every token appears in `text` (case/punctuation-insensitive). */
export function textMatchesTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const normalized = normalizeText(text);
  return tokens.every((token) => normalized.includes(token));
}

/** True when the article's title matches every token. */
export function titleMatches(title: string, tokens: string[]): boolean {
  return textMatchesTokens(title, tokens);
}

/** Filter articles whose titles match the query. Empty query → unchanged. */
export function filterBySearch(articles: Article[], query: string): Article[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return articles;
  return articles.filter((article) => titleMatches(article.title, tokens));
}

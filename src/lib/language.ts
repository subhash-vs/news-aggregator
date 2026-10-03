import type { Article } from "@/types";

/** Devanagari block — Hindi / Marathi / Nepali headlines. */
const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * Drop non-English (primarily Hindi) stories by script detection on
 * title + summary. English text with a rare Devanagari token is rare enough
 * that presence is a good proxy.
 */
export function isNonEnglishHeadline(article: Article): boolean {
  const text = `${article.title ?? ""} ${article.summary ?? ""}`;
  return DEVANAGARI.test(text);
}

export function excludeNonEnglish(articles: Article[]): Article[] {
  return articles.filter((a) => !isNonEnglishHeadline(a));
}

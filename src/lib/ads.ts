import type { Article } from "@/types";

/** Promotional / non-story URL paths common in publisher RSS. */
const PROMO_URL =
  /\/(visualstories|programmes|programme|anchor|so-sorry|newsmo)\//i;

/**
 * Deal/ad headline patterns — product drops, sale promos, "details inside".
 * Avoids real price news ("LPG cylinder price hiked") by requiring deal framing.
 */
const DEAL_HEADLINE =
  /\b(price drops? to lowest|now cheaper|huge discount|here'?s the deal|here is the deal|price cut|big price cut|bbd sale|flipkart|no conditions|details inside|gets? rs [\d,]+ off|available at [\d,]+)\b/i;

/** Live-blog / rolling-update chrome, not a real headline (NYT et al.). */
const PLACEHOLDER_HEADLINE =
  /^(here['’]?s the latest|here is the latest|here['’]?s what(?:['’]?s| is) happening|live updates?:|live blog:|latest updates?:)/i;

export function isAdOrPromo(article: Article): boolean {
  const url = article.url || "";
  if (PROMO_URL.test(url)) return true;
  const title = (article.title || "").trim();
  return DEAL_HEADLINE.test(title) || PLACEHOLDER_HEADLINE.test(title);
}

export function excludeAds(articles: Article[]): Article[] {
  return articles.filter((a) => !isAdOrPromo(a));
}

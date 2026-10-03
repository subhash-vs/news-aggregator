import type { Article, SortMode } from "@/types";

/**
 * Source editorial weight — trusted desks slightly outrank UGC/wires when
 * engagement is similar.
 */
const SOURCE_WEIGHT: Record<string, number> = {
  "the guardian": 1.05,
  "guardian world": 1.05,
  "guardian international": 1.05,
  "nyt world": 1.08,
  "nyt us": 1.08,
  "nyt politics": 1.08,
  "nyt business": 1.06,
  "nyt technology": 1.05,
  "bbc world": 1.07,
  "bbc uk": 1.05,
  "bbc technology": 1.04,
  "bbc sport": 1.04,
  "cnn top stories": 1.03,
  "cnn edition": 1.02,
  "dw news": 1.03,
  "dw world": 1.03,
  "economist finance": 1.1,
  "economist business": 1.1,
  "economist science & tech": 1.08,
  hackernews: 0.95,
};

function sourceWeight(source: string): number {
  const key = source.toLowerCase();
  if (SOURCE_WEIGHT[key]) return SOURCE_WEIGHT[key];
  for (const [name, w] of Object.entries(SOURCE_WEIGHT)) {
    if (key.includes(name)) return w;
  }
  if (key.startsWith("reddit/")) return 0.9;
  if (key.startsWith("google news")) return 0.92;
  return 1.0;
}

function engagementPoints(article: Article): number {
  const raw = article.score;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return 0;
  // Log scale: 10 pts ≈ 1, 100 ≈ 2, 1000 ≈ 3
  return Math.log10(raw + 1);
}

function recencyPoints(article: Article, now: number): number {
  if (!article.publishedAt) return 0.25;
  const t = Date.parse(article.publishedAt);
  if (!Number.isFinite(t)) return 0.25;
  const hours = Math.max(0, (now - t) / 3_600_000);
  // Half-life ~18h within the typical 24–72h window
  return Math.pow(0.5, hours / 18);
}

function coverageBoost(article: Article): number {
  // "Guardian World · NYT World" style merged sources
  const parts = article.source.split("·").map((s) => s.trim()).filter(Boolean);
  return Math.min(parts.length, 4) * 0.15;
}

export function computeHeat(article: Article, now = Date.now()): number {
  const engagement = engagementPoints(article) * 4;
  const recency = recencyPoints(article, now) * 3;
  const weight = sourceWeight(article.source);
  const coverage = coverageBoost(article);
  return Number(((engagement + recency) * weight + coverage).toFixed(3));
}

export function rankArticles(articles: Article[], mode: SortMode): Article[] {
  const now = Date.now();
  const scored = articles.map((a) => ({ ...a, heat: computeHeat(a, now) }));

  if (mode === "top") {
    return scored.sort((a, b) => {
      const heatDiff = (b.heat ?? 0) - (a.heat ?? 0);
      if (Math.abs(heatDiff) > 0.01) return heatDiff;
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
  }

  return scored.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

/** Community/UGC-style sources — strong points, weaker editorial signal for leads. */
const UGC_MARKERS = [
  "hackernews",
  "hacker news",
  "reddit",
  "google news",
  "news.ycombinator",
];

export function isEditorialSource(source: string): boolean {
  const s = source.toLowerCase();
  return !UGC_MARKERS.some((m) => s.includes(m));
}

/**
 * Pick a lead story: newspaper-style — editorial desks first.
 * HN/Reddit/Google News only lead if there are no editorial stories.
 */
export function pickLeadStory(articles: Article[]): Article | null {
  if (articles.length === 0) return null;

  const withHeat = articles.map((a) => ({
    article: a,
    heat: typeof a.heat === "number" ? a.heat : computeHeat(a),
  }));

  const byHeat = (
    a: { heat: number; article: Article },
    b: { heat: number; article: Article }
  ) => {
    if (Math.abs(b.heat - a.heat) > 0.01) return b.heat - a.heat;
    const ta = a.article.publishedAt ? Date.parse(a.article.publishedAt) : 0;
    const tb = b.article.publishedAt ? Date.parse(b.article.publishedAt) : 0;
    return tb - ta;
  };

  const editorial = withHeat.filter((x) => isEditorialSource(x.article.source)).sort(byHeat);
  const ugc = withHeat.filter((x) => !isEditorialSource(x.article.source)).sort(byHeat);

  // Prefer editorial whenever any exist on the page
  if (editorial.length > 0) return editorial[0].article;
  return ugc[0]?.article ?? null;
}

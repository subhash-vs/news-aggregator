import type { Article, FetchResult } from "@/types";
import { cleanText } from "@/lib/html";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
  type?: string;
  by?: string;
}

export async function fetchHN(topN = 20, page = "technology"): Promise<FetchResult> {
  try {
    const idsRes = await fetch(`${HN_BASE}/topstories.json`);
    if (!idsRes.ok) {
      return { articles: [], error: `HN HTTP ${idsRes.status}` };
    }

    const ids = (await idsRes.json()) as number[];
    const selected = ids.slice(0, topN);

    const items = await Promise.all(
      selected.map(async (id) => {
        try {
          const res = await fetch(`${HN_BASE}/item/${id}.json`);
          if (!res.ok) return null;
          return (await res.json()) as HNItem | null;
        } catch (error) {
          console.error(`[hn] Failed to fetch item ${id}:`, error);
          return null;
        }
      })
    );

    const articles: Article[] = items
      .filter((item): item is HNItem => !!item && item.type === "story" && !!item.title)
      .map((item) => ({
        id: String(item.id),
        page,
        source: "hackernews",
        title: cleanText(item.title || "(untitled)") || "(untitled)",
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        thumbnail: null,
        publishedAt: item.time ? new Date(item.time * 1000).toISOString() : null,
        fetchedAt: new Date().toISOString(),
        score: item.score ?? null,
      }));

    return { articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hn] Fetch failed:", error);
    return { articles: [], error: message };
  }
}

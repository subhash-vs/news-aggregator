import type { Article, FetchResult } from "@/types";
import { cleanText } from "@/lib/html";
import { fetchWithTimeout } from "@/lib/http";

interface RedditChild {
  data: {
    id: string;
    title?: string;
    url?: string;
    permalink?: string;
    thumbnail?: string;
    created_utc?: number;
    stickied?: boolean;
    score?: number;
    ups?: number;
  };
}

export async function fetchReddit(subreddit: string, page: string): Promise<FetchResult> {
  try {
    const res = await fetchWithTimeout(`https://www.reddit.com/r/${subreddit}.json?limit=25`, {
      headers: {
        "User-Agent": "news-aggregator/0.1 (personal news reader)",
      },
    });

    if (!res.ok) {
      return { articles: [], error: `Reddit HTTP ${res.status} for r/${subreddit}` };
    }

    const data = (await res.json()) as {
      data?: { children?: RedditChild[] };
    };

    const articles: Article[] = (data.data?.children ?? [])
      .filter((child) => child.data && !child.data.stickied && child.data.title)
      .map((child) => {
        const post = child.data;
        const rawUrl = post.url || "";
        const isRedditLink = rawUrl.includes("reddit.com") || !rawUrl;
        const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : rawUrl;

        let thumbnail = post.thumbnail ?? null;
        if (thumbnail && (thumbnail === "self" || thumbnail === "default" || thumbnail === "nsfw")) {
          thumbnail = null;
        }

        return {
          id: `reddit-${subreddit}-${post.id}`,
          page,
          source: `reddit/r/${subreddit}`,
          title: cleanText(post.title || "(untitled)") || "(untitled)",
          url: isRedditLink ? permalink : rawUrl,
          thumbnail,
          publishedAt: post.created_utc
            ? new Date(post.created_utc * 1000).toISOString()
            : null,
          fetchedAt: new Date().toISOString(),
          score: post.score ?? post.ups ?? null,
        };
      });

    return { articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[reddit] Fetch failed for r/${subreddit}:`, error);
    return { articles: [], error: message };
  }
}

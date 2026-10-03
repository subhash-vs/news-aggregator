import type { FetchResult, Source } from "@/types";
import { fetchGuardian } from "./guardian";
import { fetchHN } from "./hackernews";
import { fetchReddit } from "./reddit";
import { fetchRSS } from "./rss";

export { fetchGuardian, fetchHN, fetchReddit, fetchRSS };

export async function fetchFromSource(source: Source, page: string): Promise<FetchResult> {
  if (!source.enabled) {
    return { articles: [] };
  }

  switch (source.type) {
    case "guardian": {
      const section = source.config.section ?? "world";
      const result = await fetchGuardian(section, page);
      return { ...result, articles: result.articles.map((a) => ({ ...a, source: source.name })) };
    }
    case "hn": {
      const topN = source.config.topN ? Number(source.config.topN) : 20;
      return fetchHN(Number.isFinite(topN) ? topN : 20, page);
    }
    case "reddit": {
      const subreddit = source.config.subreddit;
      if (!subreddit) {
        return { articles: [], error: `Source ${source.id} missing subreddit` };
      }
      return fetchReddit(subreddit, page);
    }
    case "rss": {
      const feedUrl = source.config.feedUrl;
      if (!feedUrl) {
        return { articles: [], error: `Source ${source.id} missing feedUrl` };
      }
      return fetchRSS(feedUrl, source.name, page);
    }
    default:
      return { articles: [], error: `Unknown source type: ${(source as Source).type}` };
  }
}

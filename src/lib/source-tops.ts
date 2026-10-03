import { dedupeArticles } from "./articles";
import { excludeAds } from "./ads";
import { fetchRSS } from "./fetchers/rss";
import { fetchHN } from "./fetchers/hackernews";
import { excludeNonEnglish } from "./language";
import type { Article } from "@/types";

function cleanFeedArticles(articles: Article[]): Article[] {
  return excludeAds(excludeNonEnglish(articles));
}

export type SourceTopKind = "front-page" | "section" | "community";

export interface SourceTopFeed {
  id: string;
  label: string;
  publisher: string;
  kind: "rss" | "hn";
  /** How faithful this list is to the site’s own “top”. */
  fidelity: SourceTopKind;
  feedUrl?: string;
  page?: string;
}

/**
 * Publisher feeds used on the Top tab.
 * Prefer true front-page / top-news RSS. Many publishers only expose
 * chronological section feeds — those are labeled `section` in the UI.
 */
export const SOURCE_TOP_FEEDS: SourceTopFeed[] = [
  {
    id: "nyt-home",
    label: "NYT Front Page",
    publisher: "The New York Times",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  },
  {
    id: "ft-home",
    label: "FT Front Page",
    publisher: "Financial Times",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://www.ft.com/rss/home",
  },
  {
    id: "fortune-home",
    label: "Fortune",
    publisher: "Fortune",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://fortune.com/feed/",
  },
  {
    id: "bloomberg-markets",
    label: "Bloomberg Markets",
    publisher: "Bloomberg",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://feeds.bloomberg.com/markets/news.rss",
  },
  {
    id: "cnbc-top",
    label: "CNBC Top News",
    publisher: "CNBC",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  },
  {
    id: "mw-top",
    label: "MarketWatch Top Stories",
    publisher: "MarketWatch",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  },
  {
    id: "yahoo-finance",
    label: "Yahoo Finance",
    publisher: "Yahoo Finance",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://finance.yahoo.com/news/rssindex",
  },
  {
    id: "aljazeera",
    label: "Al Jazeera",
    publisher: "Al Jazeera",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    id: "dw-top",
    label: "DW Top Stories",
    publisher: "Deutsche Welle",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://rss.dw.com/atom/rss-en-top",
  },
  {
    id: "bbc-news",
    label: "BBC News",
    publisher: "BBC",
    kind: "rss",
    fidelity: "section",
    feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    id: "guardian-world",
    label: "Guardian World",
    publisher: "The Guardian",
    kind: "rss",
    fidelity: "section",
    feedUrl: "https://www.theguardian.com/world/rss",
  },
  {
    id: "hindu-national",
    label: "The Hindu National",
    publisher: "The Hindu",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://www.thehindu.com/news/national/feeder/default.rss",
  },
  {
    id: "indian-express",
    label: "Indian Express",
    publisher: "Indian Express",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://indianexpress.com/feed/",
  },
  {
    id: "techcrunch",
    label: "TechCrunch",
    publisher: "TechCrunch",
    kind: "rss",
    fidelity: "front-page",
    feedUrl: "https://techcrunch.com/feed/",
  },
  {
    id: "wired",
    label: "Wired",
    publisher: "Wired",
    kind: "rss",
    fidelity: "section",
    feedUrl: "https://www.wired.com/feed/rss",
  },
  {
    id: "hn-top",
    label: "Hacker News Top",
    publisher: "Hacker News",
    kind: "hn",
    fidelity: "community",
    page: "technology",
  },
];

export interface SourceTopResult {
  feed: SourceTopFeed;
  articles: Article[];
  error?: string;
}

export async function getSourceTops(limitPerFeed = 6): Promise<SourceTopResult[]> {
  const results = await Promise.all(
    SOURCE_TOP_FEEDS.map(async (feed) => {
      try {
        if (feed.kind === "hn") {
          const result = await fetchHN(20, feed.page ?? "technology");
          // Preserve HN’s own top order — do not re-rank by our heat score.
          return {
            feed,
            articles: cleanFeedArticles(dedupeArticles(result.articles)).slice(0, limitPerFeed),
            error: result.error,
          };
        }

        const result = await fetchRSS(feed.feedUrl!, feed.label, "top");
        // Keep publisher order for front-page feeds.
        // Transient failures still return so the UI can show “unavailable”
        // rather than pretending the feed is gone forever.
        const articles = cleanFeedArticles(dedupeArticles(result.articles)).slice(0, limitPerFeed);
        return { feed, articles, error: result.error };
      } catch (error) {
        return {
          feed,
          articles: [],
          error: error instanceof Error ? error.message : "Failed to load",
        };
      }
    })
  );

  // Successful feeds first; empty ones with errors stay visible as temporary.
  return results.sort((a, b) => {
    const aOk = a.articles.length > 0 ? 0 : 1;
    const bOk = b.articles.length > 0 ? 0 : 1;
    return aOk - bOk;
  });
}

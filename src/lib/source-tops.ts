import { dedupeArticles } from "./articles";
import { excludeAds } from "./ads";
import { fetchRSS } from "./fetchers/rss";
import { fetchHN } from "./fetchers/hackernews";
import { enqueueFetch, isFeedCooledOff, recordFeedFailure, recordFeedSuccess } from "./feed-queue";
import { getYahooFinanceSymbols } from "./config";
import { db } from "./db";
import { excludeNonEnglish } from "./language";
import { yahooFeedUrl } from "./yahoo-finance";
import type { Article } from "@/types";

/* Hoisted prepared statements — see db.ts note; these run per publisher-feed
 * refresh and per /api/top request. */
const stmtUpsertSourceTop = db.prepare(`
  INSERT INTO source_tops (feed_id, label, publisher, kind, fidelity, feed_url, page, articles_json, error, fetched_at)
  VALUES ($id, $label, $publisher, $kind, $fidelity, $feedUrl, $page, $articles, $error, datetime('now'))
  ON CONFLICT(feed_id) DO UPDATE SET
    label = excluded.label,
    publisher = excluded.publisher,
    kind = excluded.kind,
    fidelity = excluded.fidelity,
    feed_url = excluded.feed_url,
    page = excluded.page,
    articles_json = excluded.articles_json,
    error = excluded.error,
    fetched_at = excluded.fetched_at
`);

const stmtTouchSourceTop = db.prepare(
  "UPDATE source_tops SET fetched_at = datetime('now') WHERE feed_id = ?"
);

const stmtSelectAllSourceTops = db.prepare("SELECT * FROM source_tops");

const stmtReadSourceTopArticles = db.prepare(
  "SELECT articles_json FROM source_tops WHERE feed_id = ?"
);

function cleanFeedArticles(articles: Article[]): Article[] {
  return excludeAds(excludeNonEnglish(articles));
}

export type SourceTopKind = "front-page" | "section" | "community";

export interface SourceTopFeed {
  id: string;
  label: string;
  publisher: string;
  kind: "rss" | "hn";
  /** How faithful this list is to the site's own "top". */
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
    label: "Yahoo Finance Watchlist",
    publisher: "Yahoo Finance",
    kind: "rss",
    fidelity: "front-page",
    // No static feedUrl — resolved at refresh time from
    // settings.yahooFinanceSymbols (Yahoo killed its general finance RSS).
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
  fetchedAt?: string;
}

/** Cached articles kept per feed; the UI only ever shows a handful. */
const CACHE_ARTICLE_CAP = 12;
/** A cached row older than this is refreshed in the background on read. */
const CACHE_TTL_MS = 20 * 60 * 1000;

interface SourceTopRow {
  feed_id: string;
  label: string;
  publisher: string;
  kind: string;
  fidelity: string | null;
  feed_url: string | null;
  page: string | null;
  articles_json: string;
  error: string | null;
  fetched_at: string;
}

function rowToResult(row: SourceTopRow): SourceTopResult {
  let articles: Article[] = [];
  try {
    const parsed = JSON.parse(row.articles_json) as Article[];
    if (Array.isArray(parsed)) articles = parsed;
  } catch {
    articles = [];
  }
  return {
    feed: {
      id: row.feed_id,
      label: row.label,
      publisher: row.publisher,
      kind: (row.kind === "hn" ? "hn" : "rss") as "rss" | "hn",
      fidelity: (row.fidelity ?? "front-page") as SourceTopKind,
      feedUrl: row.feed_url ?? undefined,
      page: row.page ?? undefined,
    },
    articles,
    error: row.error ?? undefined,
    fetchedAt: row.fetched_at,
  };
}

function upsertSourceTopRow(
  feed: SourceTopFeed,
  articles: Article[],
  error: string | null,
  feedUrl: string | null
): void {
  stmtUpsertSourceTop.run({
    $id: feed.id,
    $label: feed.label,
    $publisher: feed.publisher,
    $kind: feed.kind,
    $fidelity: feed.fidelity,
    $feedUrl: feedUrl,
    $page: fetchPageOf(feed),
    $articles: JSON.stringify(articles),
    $error: error,
  });
}

function fetchPageOf(feed: SourceTopFeed): string | null {
  return feed.page ?? null;
}

/**
 * Resolve a feed's URL. The Yahoo watchlist entry has no static URL — its
 * URL is built from settings.yahooFinanceSymbols at fetch time, so editing
 * the watchlist in Settings changes what gets fetched without a redeploy.
 */
function resolveFeedUrl(feed: SourceTopFeed): string | null {
  if (feed.id === "yahoo-finance") {
    return yahooFeedUrl(getYahooFinanceSymbols());
  }
  return feed.feedUrl ?? null;
}

/**
 * Refresh one publisher feed through the global fetch queue and persist the
 * result to SQLite. Never called from a request path directly — routes call
 * `getCachedSourceTops()`, which schedules this in the background.
 */
function refreshOne(feed: SourceTopFeed): Promise<void> {
  return enqueueFetch(`sourcetop:${feed.id}`, async () => {
    if (isFeedCooledOff(`sourcetop:${feed.id}`)) return;
    try {
      const feedUrl = resolveFeedUrl(feed);
      if (feed.kind === "rss" && !feedUrl) {
        // RSS feed without a resolvable URL (e.g. empty watchlist) — skip.
        recordFeedFailure(`sourcetop:${feed.id}`);
        return;
      }
      const result =
        feed.kind === "hn"
          ? await fetchHN(20, feed.page ?? "technology")
          : await fetchRSS(feedUrl!, feed.label, "top");

      if (result.notModified) {
        // 304 — feed unchanged. Keep cached articles, reset the staleness clock.
        recordFeedSuccess(`sourcetop:${feed.id}`);
        stmtTouchSourceTop.run(feed.id);
        return;
      }

      const articles = cleanFeedArticles(dedupeArticles(result.articles)).slice(
        0,
        CACHE_ARTICLE_CAP
      );
      if (result.error) {
        recordFeedFailure(`sourcetop:${feed.id}`);
      } else {
        recordFeedSuccess(`sourcetop:${feed.id}`);
      }
      // On error keep the previous articles if we have them; just note the error.
      upsertSourceTopRow(
        feed,
        articles.length ? articles : readCachedArticles(feed.id),
        result.error ?? null,
        feedUrl
      );
    } catch (error) {
      recordFeedFailure(`sourcetop:${feed.id}`);
      console.error(`[source-tops] Refresh failed for ${feed.id}:`, error);
    }
  });
}

function readCachedArticles(feedId: string): Article[] {
  const row = stmtReadSourceTopArticles.get(feedId) as { articles_json: string } | undefined;
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.articles_json) as Article[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Schedule background refreshes for feeds whose cache is stale or missing. */
function scheduleStaleRefreshes(rows: Map<string, SourceTopRow>): void {
  const now = Date.now();
  for (const feed of SOURCE_TOP_FEEDS) {
    const row = rows.get(feed.id);
    let stale = !row;
    if (row) {
      const fetched = Date.parse(row.fetched_at);
      stale = !Number.isFinite(fetched) || now - fetched > CACHE_TTL_MS;
      // URL drift — e.g. the user edited the Yahoo watchlist in Settings.
      // The cached row was fetched from the old symbol list; refetch now
      // instead of serving stale articles until the TTL expires.
      if (!stale && row.feed_url !== resolveFeedUrl(feed)) stale = true;
    }
    if (stale) {
      void refreshOne(feed).catch(() => {});
    }
  }
}

/**
 * Cached publisher tops. This is a pure SQLite read — the request path never
 * waits on the network. Stale/missing feeds are refreshed in the background
 * through the global fetch queue (max 3 concurrent, deduped, circuit-broken).
 */
export function getCachedSourceTops(limitPerFeed = 6): SourceTopResult[] {
  const rows = stmtSelectAllSourceTops.all() as unknown as SourceTopRow[];
  const byId = new Map(rows.map((r) => [r.feed_id, r]));

  scheduleStaleRefreshes(byId);

  // Config order first, then any extras; cache hits sliced to the UI limit.
  const results: SourceTopResult[] = [];
  for (const feed of SOURCE_TOP_FEEDS) {
    const row = byId.get(feed.id);
    if (row) {
      const result = rowToResult(row);
      result.articles = result.articles.slice(0, limitPerFeed);
      results.push(result);
    } else {
      results.push({ feed, articles: [], error: "loading" });
    }
  }
  // Successful feeds first; empty ones stay visible as temporary.
  return results.sort((a, b) => {
    const aOk = a.articles.length > 0 ? 0 : 1;
    const bOk = b.articles.length > 0 ? 0 : 1;
    return aOk - bOk;
  });
}

/** Force-refresh every publisher feed via the queue (dedup + cap apply). */
export function refreshAllSourceTops(): void {
  for (const feed of SOURCE_TOP_FEEDS) {
    void refreshOne(feed).catch(() => {});
  }
}

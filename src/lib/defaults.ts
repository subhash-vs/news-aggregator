import type { AppConfig } from "@/types";
import { DEFAULT_YAHOO_SYMBOLS, yahooFeedUrl } from "./yahoo-finance";

function rss(name: string, feedUrl: string, id?: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id: id || `rss-${slug}`,
    type: "rss" as const,
    name,
    enabled: true,
    config: { feedUrl },
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  settings: {
    maxAgeHours: 24,
    sortMode: "latest",
    designTheme: "broadsheet",
    latestWindowHours: 2,
    yahooFinanceSymbols: [...DEFAULT_YAHOO_SYMBOLS],
  },
  pages: [
    {
      id: "top",
      label: "Top",
      order: 0,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [],
      categories: [],
    },
    {
      id: "latest",
      label: "Latest",
      order: 1,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [],
      categories: [],
    },
    {
      id: "world",
      label: "World",
      order: 2,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        {
          id: "guardian-api-world",
          type: "guardian",
          name: "The Guardian",
          enabled: true,
          config: { section: "world" },
        },
        rss("Guardian World", "https://www.theguardian.com/world/rss"),
        rss("Guardian International", "https://www.theguardian.com/international/rss"),
        rss("NYT World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"),
        rss("NYT US", "https://rss.nytimes.com/services/xml/rss/nyt/US.xml"),
        rss("NYT Politics", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"),
        rss("NYT Climate", "https://rss.nytimes.com/services/xml/rss/nyt/Climate.xml"),
        rss("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
        rss("BBC UK", "https://feeds.bbci.co.uk/news/uk/rss.xml"),
        // CNN public RSS is frozen (2023) — use Google News CNN coverage instead
        rss(
          "CNN via Google News",
          "https://news.google.com/rss/search?q=site:cnn.com&hl=en-US&gl=US&ceid=US:en"
        ),
        rss(
          "CNN World via Google News",
          "https://news.google.com/rss/search?q=cnn+world&hl=en-US&gl=US&ceid=US:en"
        ),
        rss(
          "CNN Politics via Google News",
          "https://news.google.com/rss/search?q=cnn+politics&hl=en-US&gl=US&ceid=US:en"
        ),
        rss("DW News", "https://rss.dw.com/rdf/rss-en-top"),
        rss("DW World", "https://rss.dw.com/rdf/rss-en-world"),
        rss("FT World", "https://www.ft.com/rss/world"),
        rss("Bloomberg Politics", "https://feeds.bloomberg.com/politics/news.rss"),
        rss(
          "Google News · Economist",
          "https://news.google.com/rss/search?q=Economist+news&hl=en-US&gl=US&ceid=US:en"
        ),
        rss(
          "Google News · World",
          "https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en"
        ),
      ],
      categories: [
        {
          id: "politics",
          label: "Politics",
          enabled: true,
          keywords: ["politics", "election", "congress", "parliament", "white house", "president", "minister", "policy"],
        },
        {
          id: "conflicts",
          label: "Conflicts",
          enabled: true,
          keywords: ["war", "conflict", "ceasefire", "military", "troops", "invasion", "strike"],
        },
        {
          id: "climate",
          label: "Climate",
          enabled: true,
          keywords: ["climate", "emissions", "warming", "renewable", "flood", "drought"],
        },
      ],
    },
    {
      id: "finance",
      label: "Finance",
      order: 3,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        rss("NYT Business", "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"),
        rss("NYT Economy", "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml"),
        rss("NYT Your Money", "https://rss.nytimes.com/services/xml/rss/nyt/YourMoney.xml"),
        rss("NYT Upshot", "https://rss.nytimes.com/services/xml/rss/nyt/Upshot.xml"),
        rss(
          "Economist Finance",
          "https://www.economist.com/finance-and-economics/rss.xml"
        ),
        rss("Economist Business", "https://www.economist.com/business/rss.xml"),
        rss("FT Markets", "https://www.ft.com/rss/markets"),
        rss("FT Global Economy", "https://www.ft.com/global-economy?format=rss"),
        rss("FT Companies", "https://www.ft.com/companies?format=rss"),
        rss("Fortune", "https://fortune.com/feed/"),
        rss("Bloomberg Markets", "https://feeds.bloomberg.com/markets/news.rss"),
        rss("Bloomberg Economics", "https://feeds.bloomberg.com/economics/news.rss"),
        rss("Bloomberg Industries", "https://feeds.bloomberg.com/industries/news.rss"),
        rss("WSJ Markets", "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
        rss("DJ Markets", "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain"),
        rss(
          "Google News · Finance",
          "https://news.google.com/rss/search?q=stock+market+OR+fed+OR+inflation&hl=en-US&gl=US&ceid=US:en"
        ),
        rss("CNBC Top News", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
        rss("CNBC World", "https://www.cnbc.com/id/19854910/device/rss/rss.html"),
        rss("CNBC Investing", "https://www.cnbc.com/id/10000664/device/rss/rss.html"),
        // Yahoo killed its general finance RSS (404, Oct 2026) — the per-symbol
        // headline feed is the surviving replacement. Symbols are user-
        // configurable (Settings → pages → Yahoo Finance watchlist).
        rss(
          "Yahoo Finance Watchlist",
          yahooFeedUrl(DEFAULT_YAHOO_SYMBOLS) ??
            "https://feeds.finance.yahoo.com/rss/2.0/headline?s=VOO&region=US&lang=en-US",
          "rss-yahoo-finance-watchlist"
        ),
        rss("MarketWatch Top Stories", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
        rss("Business Insider", "https://www.businessinsider.com/rss"),
      ],
      categories: [
        {
          id: "markets",
          label: "Markets",
          enabled: true,
          keywords: ["stock", "market", "nasdaq", "dow", "s&p", "shares", "equity", "bond", "yield", "sensex", "nifty"],
        },
        {
          id: "economy",
          label: "Economy",
          enabled: true,
          keywords: ["inflation", "fed", "interest rate", "gdp", "recession", "economy", "jobs"],
        },
        {
          id: "business",
          label: "Business",
          enabled: true,
          keywords: ["earnings", "company", "startup", "merger", "acquisition", "ipo", "ceo"],
        },
      ],
    },
    {
      id: "technology",
      label: "Technology",
      order: 4,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        rss("NYT Technology", "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"),
        rss("NYT Science", "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml"),
        rss("BBC Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
        rss("Guardian Technology", "https://www.theguardian.com/technology/rss"),
        rss("Guardian AI", "https://www.theguardian.com/technology/artificialintelligenceai/rss"),
        rss("Economist Science & Tech", "https://www.economist.com/science-and-technology/rss.xml"),
        rss("DW Science", "https://rss.dw.com/rdf/rss-en-science"),
        rss("FT Technology", "https://www.ft.com/technology?format=rss"),
        rss("Bloomberg Technology", "https://feeds.bloomberg.com/technology/news.rss"),
        {
          id: "hn",
          type: "hn",
          name: "Hacker News",
          enabled: true,
          config: { topN: "20" },
        },
        rss("TechCrunch", "https://techcrunch.com/feed/"),
        rss("The Verge", "https://www.theverge.com/rss/index.xml"),
        rss("Ars Technica", "https://arstechnica.com/feed/"),
        rss("Wired", "https://www.wired.com/feed/rss"),
        rss("MIT Technology Review", "https://www.technologyreview.com/feed/"),
        rss("Engadget", "https://www.engadget.com/rss.xml"),
        rss("CNBC Technology", "https://www.cnbc.com/id/15839069/device/rss/rss.html"),
      ],
      categories: [
        {
          id: "ai",
          label: "AI",
          enabled: true,
          keywords: ["ai", "artificial intelligence", "openai", "llm", "machine learning", "chatgpt", "gpt", "claude"],
        },
        {
          id: "software",
          label: "Software",
          enabled: true,
          keywords: ["software", "developer", "open source", "github", "app", "api"],
        },
        {
          id: "hardware",
          label: "Hardware",
          enabled: true,
          keywords: ["chip", "hardware", "cpu", "gpu", "device", "phone", "laptop", "semiconductor"],
        },
      ],
    },
    {
      id: "india",
      label: "India",
      order: 5,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        rss("The Hindu National", "https://www.thehindu.com/news/national/feeder/default.rss"),
        rss("NDTV Top Stories", "https://feeds.feedburner.com/ndtvnews-top-stories"),
        rss("NDTV India", "https://feeds.feedburner.com/ndtvnews-india-news"),
        rss("India Today", "https://www.indiatoday.in/rss/home"),
        rss("Times of India Top", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"),
        rss("Hindustan Times India", "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml"),
        rss("Hindustan Times Business", "https://www.hindustantimes.com/feeds/rss/business/rssfeed.xml"),
        rss("The Hindu Business", "https://www.thehindu.com/business/feeder/default.rss"),
        rss("Business Standard India", "https://www.business-standard.com/rss/india-news-102.rss"),
        rss("Business Standard Latest", "https://www.business-standard.com/rss/latest.rss"),
        rss("Mint Industry", "https://www.livemint.com/rss/industry"),
        rss("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
      ],
      categories: [
        {
          id: "national",
          label: "National",
          enabled: true,
          keywords: ["india", "delhi", "mumbai", "parliament", "lok sabha", "rajya sabha", "modi", "government", "election"],
        },
        {
          id: "india-business",
          label: "Business",
          enabled: true,
          keywords: ["rbi", "sensex", "nifty", "startup", "markets", "rupee", "earnings", "company", "ipo"],
        },
        {
          id: "india-cricket",
          label: "Cricket",
          enabled: true,
          keywords: ["cricket", "ipl", "bcci", "test match", "odi", "t20", "virat", "rohit"],
        },
      ],
    },
    {
      id: "movies",
      label: "Movies",
      order: 6,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        rss("NYT Movies", "https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml"),
        rss("NYT Style", "https://rss.nytimes.com/services/xml/rss/nyt/Style.xml"),
        rss("BBC Arts", "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"),
        rss("Guardian Film", "https://www.theguardian.com/film/rss"),
        {
          id: "guardian-films",
          type: "guardian",
          name: "Guardian Films (API)",
          enabled: true,
          config: { section: "film" },
        },
        {
          id: "reddit-movies",
          type: "reddit",
          name: "Reddit r/movies",
          enabled: true,
          config: { subreddit: "movies" },
        },
        {
          id: "reddit-bollywood",
          type: "reddit",
          name: "Reddit r/Bollywood",
          enabled: true,
          config: { subreddit: "Bollywood" },
        },
      ],
      categories: [
        {
          id: "hollywood",
          label: "Hollywood",
          enabled: true,
          keywords: ["hollywood", "box office", "marvel", "netflix", "cinema", "trailer", "film"],
        },
        {
          id: "bollywood",
          label: "Bollywood",
          enabled: true,
          keywords: ["bollywood", "hindi", "shah rukh", "indian cinema", "filmfare"],
        },
      ],
    },
    {
      id: "sports",
      label: "Sports",
      order: 7,
      enabled: true,
      refreshIntervalMinutes: 0,
      sources: [
        rss("NYT Soccer", "https://rss.nytimes.com/services/xml/rss/nyt/Soccer.xml"),
        rss("BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"),
        rss("Guardian Sport", "https://www.theguardian.com/sport/rss"),
        rss("DW Sports", "https://rss.dw.com/rdf/rss-en-sports"),

        {
          id: "reddit-cricket",
          type: "reddit",
          name: "Reddit r/cricket",
          enabled: true,
          config: { subreddit: "cricket" },
        },
        {
          id: "reddit-formula1",
          type: "reddit",
          name: "Reddit r/formula1",
          enabled: true,
          config: { subreddit: "formula1" },
        },
      ],
      categories: [
        {
          id: "cricket",
          label: "Cricket",
          enabled: true,
          keywords: ["cricket", "ipl", "test match", "odi", "t20"],
        },
        {
          id: "f1",
          label: "Formula 1",
          enabled: true,
          keywords: ["f1", "formula 1", "formula one", "grand prix"],
        },
        {
          id: "football",
          label: "Football",
          enabled: true,
          keywords: ["football", "soccer", "premier league", "la liga", "fifa", "uefa"],
        },
      ],
    },
  ],
};

import Parser from "rss-parser";
import type { Article, FetchResult } from "@/types";
import { cleanText, decodeHtmlEntities } from "@/lib/html";

type MediaNode = {
  $?: { url?: string; medium?: string; type?: string; width?: string; height?: string };
  url?: string;
};

const parser = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["media:content", "mediaContent", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
      ["media:group", "mediaGroup", { keepArray: true }],
    ],
  },
});

const RSS_TIMEOUT_MS = 10_000;
/** Hard cap on feed size — a runaway feed must never OOM the 512MB VM. */
const MAX_FEED_BYTES = 5 * 1024 * 1024;

function firstUrlFromMedia(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.startsWith("http") ? value : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = firstUrlFromMedia(entry);
      if (url) return url;
    }
    return null;
  }

  if (typeof value === "object") {
    const node = value as MediaNode;
    if (node.$?.url) return node.$.url;
    if (node.url) return node.url;
    if (Array.isArray((node as { $?: unknown }).$)) {
      return firstUrlFromMedia((node as { $: unknown }).$);
    }
  }

  return null;
}

function firstImgFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = match?.[1];
  if (!src) return null;
  if (src.startsWith("data:")) return null;
  return src;
}

function extractSummary(html?: string | null): string | null {
  if (!html) return null;
  const text = cleanText(html);
  if (!text) return null;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const joined = sentences.slice(0, 2).join(" ").trim();
  if (joined.length < 40) return null;
  return joined.length > 320 ? `${joined.slice(0, 317).trimEnd()}…` : joined;
}

function extractThumbnail(item: {
  enclosure?: { url?: string };
  mediaThumbnail?: unknown;
  mediaContent?: unknown;
  mediaGroup?: unknown;
  content?: string;
  contentEncoded?: string;
  "media:thumbnail"?: unknown;
  "media:content"?: unknown;
}): string | null {
  const candidates = [
    item.enclosure?.url,
    firstUrlFromMedia(item.mediaThumbnail ?? item["media:thumbnail"]),
    firstUrlFromMedia(item.mediaContent ?? item["media:content"]),
    firstUrlFromMedia(item.mediaGroup),
    firstImgFromHtml(item.contentEncoded ?? item.content),
    firstImgFromHtml(item.content),
  ];

  for (const candidate of candidates) {
    if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
  }

  return null;
}

function normalizeDate(value?: string | Date): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Download a feed ourselves, then parse the string.
 *
 * rss-parser's parseURL never aborts its underlying request on timeout — the
 * socket stays open and its `xml += chunk` buffer keeps growing, leaking
 * memory on every timed-out fetch. That leak, hammered by the keep-warm loop,
 * froze the whole 512MB VM into swap thrash. Fetching via AbortController
 * keeps the signal armed for the ENTIRE download (headers + body), so a
 * trickling server can't hold us hostage, and the body size is capped.
 */
async function downloadFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "news-aggregator/0.1 (personal news reader)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      throw new Error(`RSS HTTP ${res.status}`);
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_FEED_BYTES) {
      throw new Error(`Feed too large (${declared} bytes)`);
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FEED_BYTES) {
      throw new Error(`Feed too large (${buf.byteLength} bytes)`);
    }
    return Buffer.from(buf).toString("utf8");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRSS(url: string, source: string, page: string): Promise<FetchResult> {
  try {
    const xml = await downloadFeedXml(url);
    // parseString is CPU-only (no network), so it can't hang like parseURL did.
    const feed = await parser.parseString(xml);

    const articles: Article[] = (feed.items ?? []).map((item, index) => {
      const itemAny = item as {
        content?: string;
        contentSnippet?: string;
        summary?: string;
        contentEncoded?: string;
      };
      return {
        id: cleanText((item.guid || item.link || `${source}-${index}`).toString()),
        page,
        source,
        title: cleanText(item.title || "(untitled)") || "(untitled)",
        url: decodeHtmlEntities(item.link || "").trim(),
        thumbnail: extractThumbnail(item as Parameters<typeof extractThumbnail>[0]),
        publishedAt: normalizeDate(item.pubDate || item.isoDate),
        fetchedAt: new Date().toISOString(),
        summary:
          extractSummary(itemAny.contentEncoded || itemAny.content || itemAny.summary) ??
          (itemAny.contentSnippet ? cleanText(itemAny.contentSnippet, 320) || null : null),
      };
    });

    return { articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[rss] Failed to fetch ${url}:`, error);
    return { articles: [], error: message };
  }
}

import Parser from "rss-parser";
import type { Article, FetchResult } from "@/types";
import { cleanText, decodeHtmlEntities } from "@/lib/html";
import { withTimeout } from "@/lib/http";

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

export async function fetchRSS(url: string, source: string, page: string): Promise<FetchResult> {
  try {
    const feed = await withTimeout(parser.parseURL(url), 10_000, `RSS ${url}`);

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

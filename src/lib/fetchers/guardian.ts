import type { Article, FetchResult } from "@/types";
import { cleanText } from "@/lib/html";
import { fetchWithTimeout } from "@/lib/http";
import { getHttpValidator, saveHttpValidator } from "@/lib/db";

const GUARDIAN_BASE = "https://content.guardianapis.com";

export async function fetchGuardian(section: string, page: string): Promise<FetchResult> {
  const apiKey = process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    return { articles: [], error: "GUARDIAN_API_KEY not set" };
  }

  try {
    const params = new URLSearchParams({
      "api-key": apiKey,
      section,
      "page-size": "20",
      "show-fields": "thumbnail",
      order: "newest",
    });
    const requestUrl = `${GUARDIAN_BASE}/search?${params.toString()}`;

    // Conditional request: reuse stored validators so unchanged responses
    // come back as 304 with no body to parse.
    const validator = getHttpValidator(requestUrl);
    const headers: Record<string, string> = {};
    if (validator?.etag) headers["If-None-Match"] = validator.etag;
    if (validator?.lastModified) headers["If-Modified-Since"] = validator.lastModified;

    const res = await fetchWithTimeout(requestUrl, { headers });
    if (res.status === 304) {
      return { articles: [], notModified: true };
    }
    if (!res.ok) {
      return { articles: [], error: `Guardian HTTP ${res.status}` };
    }

    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    if (etag || lastModified) {
      saveHttpValidator(requestUrl, { etag, lastModified });
    }

    const data = (await res.json()) as {
      response?: {
        results?: Array<{
          id: string;
          webTitle?: string;
          webUrl?: string;
          webPublicationDate?: string;
          fields?: { thumbnail?: string };
        }>;
      };
    };

    const articles: Article[] = (data.response?.results ?? []).map((item) => ({
      id: item.id,
      page,
      source: "guardian",
      title: cleanText(item.webTitle || "(untitled)") || "(untitled)",
      url: item.webUrl || "",
      thumbnail: item.fields?.thumbnail ?? null,
      publishedAt: item.webPublicationDate ?? null,
      fetchedAt: new Date().toISOString(),
    }));

    return { articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[guardian] Fetch failed:", error);
    return { articles: [], error: message };
  }
}

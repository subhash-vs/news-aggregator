import type { Article, FetchResult } from "@/types";
import { cleanText } from "@/lib/html";
import { fetchWithTimeout } from "@/lib/http";

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

    const res = await fetchWithTimeout(`${GUARDIAN_BASE}/search?${params.toString()}`);
    if (!res.ok) {
      return { articles: [], error: `Guardian HTTP ${res.status}` };
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

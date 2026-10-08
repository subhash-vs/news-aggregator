import { NextResponse } from "next/server";
import { getArticlesForPage, refreshPageInBackground } from "@/lib/articles";
import { getEnabledPages } from "@/lib/config";
import { articlesEtag } from "@/lib/etag";

/**
 * Explicit refresh. Single-page refreshes await the queued, deduplicated job
 * (the global fetch queue caps concurrency app-wide, so this can't storm the
 * VM). Refresh-all enqueues every page and returns immediately — the client
 * re-reads cached data right away and fresh results land as the queue drains.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const validPages = new Set(getEnabledPages().map((p) => p.id));

  try {
    if (!page) {
      const pages = getEnabledPages();
      // Fire through the queue without awaiting — queue caps concurrency at 3.
      for (const p of pages) {
        void refreshPageInBackground(p.id).catch(() => {});
      }
      return NextResponse.json({
        status: "refreshing",
        pages: pages.map((p) => p.id),
      });
    }

    if (!validPages.has(page)) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    const data = await getArticlesForPage(page, { force: true });
    return NextResponse.json(data, {
      headers: { ETag: articlesEtag(data), "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[api/articles/refresh] Failed:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

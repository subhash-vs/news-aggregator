import { NextResponse } from "next/server";
import { getArticlesForPage } from "@/lib/articles";
import { getEnabledPages } from "@/lib/config";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const validPages = new Set(getEnabledPages().map((p) => p.id));

  try {
    if (!page) {
      const pages = getEnabledPages();
      const results = await Promise.all(
        pages.map((p) => getArticlesForPage(p.id, { force: true }))
      );
      return NextResponse.json({
        refreshed: results.map((r) => ({
          page: r.page,
          count: r.articles.length,
          stale: r.stale,
        })),
      });
    }

    if (!validPages.has(page)) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    const data = await getArticlesForPage(page, { force: true });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/articles/refresh] Failed:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

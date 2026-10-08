import { NextResponse } from "next/server";
import { getCachedSourceTops } from "@/lib/source-tops";
import { getTopStories } from "@/lib/top-stories";
import { getEnabledPages, getMaxAgeHours, getSortMode } from "@/lib/config";
import { topStoriesEtag } from "@/lib/etag";

export const dynamic = "force-dynamic";

/**
 * Top Stories — pure SQLite reads. Publisher feeds are served from the
 * source_tops cache (refreshed in the background via the global fetch
 * queue when stale); ranked picks come from the cached articles table.
 * This handler never touches the network.
 *
 * Conditional GET: the client stores the ETag and sends If-None-Match on
 * revisit — unchanged payloads come back as empty 304s.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const perPage = Number(searchParams.get("perPage") ?? "6");
  const limit = Number.isFinite(perPage) && perPage > 0 ? Math.min(perPage, 12) : 6;

  try {
    const pages = getEnabledPages().map((p) => ({ id: p.id, label: p.label }));
    const maxAgeHours = getMaxAgeHours();
    const sortMode = getSortMode();

    const data = {
      articles: getTopStories(limit),
      sourceTops: getCachedSourceTops(limit),
      pages,
      generatedAt: new Date().toISOString(),
      maxAgeHours,
      sortMode,
      ranking: "heat+publisher-top",
    };

    const etag = topStoriesEtag(data);
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(data, {
      headers: { ETag: etag, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[api/top] Failed:", error);
    return NextResponse.json({ error: "Failed to load top stories" }, { status: 500 });
  }
}

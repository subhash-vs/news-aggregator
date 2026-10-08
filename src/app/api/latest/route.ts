import { NextResponse } from "next/server";
import { getEnabledPages, getLatestWindowHours } from "@/lib/config";
import { getLatestStories } from "@/lib/latest-stories";
import { latestStoriesEtag } from "@/lib/etag";

export const dynamic = "force-dynamic";

/**
 * Latest — pure SQLite reads through the cached Latest pipeline.
 * Conditional GET: unchanged payloads come back as empty 304s via
 * the client's If-None-Match.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hoursRaw = searchParams.get("hours");
  const limitRaw = Number(searchParams.get("limit") ?? 60);
  const defaultHours = getLatestWindowHours();
  const hours =
    hoursRaw === null
      ? defaultHours
      : (() => {
          const n = Number(hoursRaw);
          return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : defaultHours;
        })();
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 120) : 60;

  try {
    const pages = getEnabledPages().map((p) => ({ id: p.id, label: p.label }));
    const data = {
      articles: getLatestStories({ hours, limit }),
      windowHours: hours,
      pages,
      generatedAt: new Date().toISOString(),
    };

    const etag = latestStoriesEtag(data);
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
    console.error("[api/latest] Failed:", error);
    return NextResponse.json({ error: "Failed to load latest stories" }, { status: 500 });
  }
}

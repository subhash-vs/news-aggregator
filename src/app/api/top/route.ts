import { NextResponse } from "next/server";
import { getSourceTops } from "@/lib/source-tops";
import { getTopStories } from "@/lib/top-stories";
import { getEnabledPages, getMaxAgeHours, getSortMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const perPage = Number(searchParams.get("perPage") ?? "6");
  const limit = Number.isFinite(perPage) && perPage > 0 ? Math.min(perPage, 12) : 6;

  try {
    const [heatArticles, sourceTops] = await Promise.all([
      Promise.resolve(getTopStories(limit)),
      getSourceTops(limit),
    ]);

    return NextResponse.json({
      articles: heatArticles,
      sourceTops,
      pages: getEnabledPages().map((p) => ({ id: p.id, label: p.label })),
      generatedAt: new Date().toISOString(),
      maxAgeHours: getMaxAgeHours(),
      sortMode: getSortMode(),
      ranking: "heat+publisher-top",
    });
  } catch (error) {
    console.error("[api/top] Failed:", error);
    return NextResponse.json({ error: "Failed to load top stories" }, { status: 500 });
  }
}

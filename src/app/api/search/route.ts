import { NextResponse } from "next/server";
import { searchAllCachedArticles } from "@/lib/global-search";

/**
 * GET /api/search?q=…&limit=50 — global title search across every enabled
 * page's cached articles. q is required (any length the client sends;
 * tokenize() decides what's matchable), limit clamps to 1–100.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing q query param" },
      { status: 400 }
    );
  }

  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
    : 50;

  try {
    const { articles, total } = searchAllCachedArticles(q, limit);
    return NextResponse.json(
      { query: q, articles, total, limit, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[api/search] Failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

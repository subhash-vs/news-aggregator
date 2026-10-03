import { NextResponse } from "next/server";
import { getEnabledPages, getLatestWindowHours } from "@/lib/config";
import { getLatestStories } from "@/lib/latest-stories";

export const dynamic = "force-dynamic";

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
    const articles = getLatestStories({ hours, limit });
    return NextResponse.json({
      articles,
      windowHours: hours,
      pages: getEnabledPages().map((p) => ({ id: p.id, label: p.label })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/latest] Failed:", error);
    return NextResponse.json({ error: "Failed to load latest stories" }, { status: 500 });
  }
}

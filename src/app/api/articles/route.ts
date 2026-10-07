import { after, NextResponse } from "next/server";
import { getArticlesForPage, refreshPageInBackground } from "@/lib/articles";
import { getEnabledPages } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const validPages = new Set(getEnabledPages().map((p) => p.id));

  if (!page || !validPages.has(page)) {
    return NextResponse.json(
      { error: "Invalid or missing page query param" },
      { status: 400 }
    );
  }

  try {
    const data = await getArticlesForPage(page);

    // Stale-while-revalidate: if we served cached (stale) articles, refresh
    // sources in the background so the next request gets fresh data without
    // ever blocking a response on network fetches.
    if (data.stale) {
      after(() => refreshPageInBackground(page));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/articles] Failed:", error);
    return NextResponse.json({ error: "Failed to load articles" }, { status: 500 });
  }
}

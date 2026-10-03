import { NextResponse } from "next/server";
import { listBookmarks, toggleBookmark } from "@/lib/bookmarks";
import type { Article } from "@/types";

export async function GET() {
  try {
    return NextResponse.json({ bookmarks: listBookmarks() });
  } catch (error) {
    console.error("[api/bookmarks] GET failed:", error);
    return NextResponse.json({ error: "Failed to load bookmarks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { article?: Article };

    if (
      !body.article ||
      typeof body.article.id !== "string" ||
      typeof body.article.title !== "string"
    ) {
      return NextResponse.json({ error: "article with id and title is required" }, { status: 400 });
    }

    const result = toggleBookmark(body.article);
    return NextResponse.json({ ...result, bookmarks: listBookmarks() });
  } catch (error) {
    console.error("[api/bookmarks] POST failed:", error);
    return NextResponse.json({ error: "Failed to update bookmark" }, { status: 500 });
  }
}

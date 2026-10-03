import { NextResponse } from "next/server";
import { deleteCustomFeed, upsertCustomFeed } from "@/lib/config";
import type { FeedAction, Source } from "@/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pageId?: string;
      action?: FeedAction;
      source?: Partial<Source> & { feedUrl?: string; name?: string };
      sourceId?: string;
    };

    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    const action = body.action;
    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if (action === "delete") {
      if (!body.sourceId) {
        return NextResponse.json({ error: "sourceId is required for delete" }, { status: 400 });
      }
      const config = deleteCustomFeed(body.pageId, body.sourceId);
      return NextResponse.json({ config });
    }

    const s = body.source;
    const feedUrl = s?.config?.feedUrl || s?.feedUrl;
    const name = s?.name;

    if (!feedUrl || !name) {
      return NextResponse.json({ error: "source.name and feed URL are required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(feedUrl);
    } catch {
      return NextResponse.json({ error: "feedUrl must be a valid URL" }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "feedUrl must be http(s)" }, { status: 400 });
    }

    const source: Source = {
      id: s?.id || `custom-${slugify(name)}`,
      type: "rss",
      name,
      enabled: true,
      custom: true,
      config: { feedUrl },
    };

    const config = upsertCustomFeed(body.pageId, source, action);
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config/feeds] Failed:", error);
    return NextResponse.json({ error: "Failed to update custom feed" }, { status: 500 });
  }
}

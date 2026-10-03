import { NextResponse } from "next/server";
import { getConfig, setPageEnabled, setPageRefreshInterval, toggleSource } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pageId?: string;
      sourceId?: string;
      enabled?: boolean;
    };

    if (!body.pageId || !body.sourceId) {
      return NextResponse.json({ error: "pageId and sourceId are required" }, { status: 400 });
    }

    let config = toggleSource(body.pageId, body.sourceId);

    if (typeof body.enabled === "boolean") {
      const page = config.pages.find((p) => p.id === body.pageId);
      const source = page?.sources.find((s) => s.id === body.sourceId);
      if (source && source.enabled !== body.enabled) {
        config = toggleSource(body.pageId, body.sourceId);
      }
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config/sources] POST failed:", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      pageId?: string;
      enabled?: boolean;
      refreshIntervalMinutes?: number;
    };

    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    let config = getConfig();

    if (typeof body.enabled === "boolean") {
      config = setPageEnabled(body.pageId, body.enabled);
    }

    if (typeof body.refreshIntervalMinutes === "number" && body.refreshIntervalMinutes >= 0) {
      config = setPageRefreshInterval(body.pageId, body.refreshIntervalMinutes);
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config/sources] PUT failed:", error);
    return NextResponse.json({ error: "Failed to update page settings" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { reorderPages } from "@/lib/config";
import { validateConfig } from "@/lib/validate";

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { pageIds?: unknown };

    if (!Array.isArray(body.pageIds) || body.pageIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "pageIds must be an array of strings" }, { status: 400 });
    }

    const config = reorderPages(body.pageIds as string[]);
    const { valid, errors } = validateConfig(config);
    if (!valid) {
      return NextResponse.json({ error: "Reorder produced invalid config", errors }, { status: 400 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config/reorder] Failed:", error);
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}

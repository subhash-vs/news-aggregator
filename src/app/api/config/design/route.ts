import { NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/config";
import type { DesignTheme } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { designTheme?: DesignTheme };
    const designTheme = body.designTheme;

    if (designTheme !== "nyt" && designTheme !== "broadsheet") {
      return NextResponse.json(
        { error: 'designTheme must be "nyt" or "broadsheet"' },
        { status: 400 }
      );
    }

    const config = getConfig();
    const prev = config.settings;
    config.settings = {
      maxAgeHours: prev?.maxAgeHours ?? 24,
      sortMode: prev?.sortMode ?? "latest",
      designTheme,
      latestWindowHours: prev?.latestWindowHours,
    };
    saveConfig(config);

    return NextResponse.json({ designTheme });
  } catch (error) {
    console.error("[api/config/design] Failed:", error);
    return NextResponse.json({ error: "Failed to save design theme" }, { status: 500 });
  }
}

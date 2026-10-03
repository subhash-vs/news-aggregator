import { NextResponse } from "next/server";
import { getConfig, resetConfig, saveConfig, cloneDefaultConfig } from "@/lib/config";
import { validateConfig } from "@/lib/validate";

export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json({ config, defaults: cloneDefaultConfig() });
  } catch (error) {
    console.error("[api/config] GET failed:", error);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; config?: unknown };

    if (body.action === "reset") {
      const config = resetConfig();
      return NextResponse.json({ config });
    }

    const { valid, errors } = validateConfig(body.config);
    if (!valid) {
      return NextResponse.json({ error: "Invalid config", errors }, { status: 400 });
    }

    saveConfig(body.config as Parameters<typeof saveConfig>[0]);
    return NextResponse.json({ config: getConfig() });
  } catch (error) {
    console.error("[api/config] POST failed:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { deleteCategory, toggleCategory, upsertCategory } from "@/lib/config";
import type { Category, CategoryAction } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pageId?: string;
      action?: CategoryAction;
      category?: Partial<Category>;
      categoryId?: string;
      enabled?: boolean;
    };

    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    if (typeof body.enabled === "boolean" && body.categoryId && !body.action) {
      const config = toggleCategory(body.pageId, body.categoryId);
      return NextResponse.json({ config });
    }

    const action = body.action;
    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if (action === "delete") {
      if (!body.categoryId) {
        return NextResponse.json({ error: "categoryId is required for delete" }, { status: 400 });
      }
      const config = deleteCategory(body.pageId, body.categoryId);
      return NextResponse.json({ config });
    }

    const c = body.category;
    if (!c?.id || !c.label) {
      return NextResponse.json({ error: "category.id and category.label are required" }, { status: 400 });
    }

    const category: Category = {
      id: c.id,
      label: c.label,
      enabled: c.enabled ?? true,
      keywords: Array.isArray(c.keywords) ? c.keywords : [],
    };

    const config = upsertCategory(body.pageId, category, action);
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config/categories] Failed:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

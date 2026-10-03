import { db } from "./db";
import type { Article } from "@/types";

export function listBookmarks(): Article[] {
  const rows = db
    .prepare("SELECT article_json FROM bookmarks ORDER BY saved_at DESC")
    .all() as Array<{ article_json: string }>;

  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.article_json) as Article];
    } catch {
      return [];
    }
  });
}

export function toggleBookmark(article: Article): { bookmarked: boolean } {
  const existing = db.prepare("SELECT id FROM bookmarks WHERE id = ?").get(article.id);
  if (existing) {
    db.prepare("DELETE FROM bookmarks WHERE id = ?").run(article.id);
    return { bookmarked: false };
  }
  db.prepare(
    "INSERT INTO bookmarks (id, article_json, saved_at) VALUES (?, ?, datetime('now'))"
  ).run(article.id, JSON.stringify(article));
  return { bookmarked: true };
}

export function isBookmarked(articleId: string): boolean {
  return !!db.prepare("SELECT id FROM bookmarks WHERE id = ?").get(articleId);
}

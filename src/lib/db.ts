import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Article } from "@/types";

// DATA_DIR is intentionally configurable via environment variable for Docker deployments
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "news.db");

if (!fs.existsSync(/* turbopackIgnore: true */ DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Use Node.js built-in sqlite (node:sqlite) instead of better-sqlite3.
// Avoids native module compilation issues across platforms.
// Requires Node.js >= 22.5. On Node 22.x, start with --experimental-sqlite.

class Database {
  private raw: DatabaseSync;

  constructor(filePath: string) {
    this.raw = new DatabaseSync(filePath);
  }

  pragma(statement: string): void {
    this.raw.exec(`PRAGMA ${statement}`);
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  prepare(sql: string) {
    return this.raw.prepare(sql);
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    const raw = this.raw;
    return ((...args: Parameters<T>): ReturnType<T> => {
      raw.exec("BEGIN");
      try {
        const result = fn(...args);
        raw.exec("COMMIT");
        return result as ReturnType<T>;
      } catch (err) {
        raw.exec("ROLLBACK");
        throw err;
      }
    }) as T;
  }
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    page TEXT NOT NULL,
    category TEXT,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    published_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    score INTEGER,
    summary TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_articles_page ON articles(page);
  CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at);

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    article_json TEXT NOT NULL,
    saved_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations for existing DBs
const articleCols = db.prepare("PRAGMA table_info(articles)").all() as unknown as Array<{ name: string }>;
if (!articleCols.some((c) => c.name === "score")) {
  db.exec("ALTER TABLE articles ADD COLUMN score INTEGER");
}
if (!articleCols.some((c) => c.name === "summary")) {
  db.exec("ALTER TABLE articles ADD COLUMN summary TEXT");
}

export function upsertArticle(article: Article): void {
  db.prepare(`
    INSERT INTO articles (id, page, category, source, title, url, thumbnail, published_at, fetched_at, score, summary)
    VALUES ($id, $page, $category, $source, $title, $url, $thumbnail, $publishedAt, $fetchedAt, $score, $summary)
    ON CONFLICT(id) DO UPDATE SET
      page = excluded.page,
      category = excluded.category,
      source = excluded.source,
      title = excluded.title,
      url = excluded.url,
      thumbnail = excluded.thumbnail,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      score = excluded.score,
      summary = excluded.summary
  `).run({
    $id: article.id,
    $page: article.page,
    $category: article.category ?? null,
    $source: article.source,
    $title: article.title,
    $url: article.url,
    $thumbnail: article.thumbnail ?? null,
    $publishedAt: article.publishedAt ?? null,
    $fetchedAt: article.fetchedAt ?? new Date().toISOString(),
    $score: article.score ?? null,
    $summary: article.summary ?? null,
  });
}

export function getArticlesByPage(page: string): Article[] {
  const rows = db
    .prepare(
      `SELECT id, page, category, source, title, url, thumbnail, published_at as publishedAt, fetched_at as fetchedAt, score, summary
       FROM articles WHERE page = ? ORDER BY published_at DESC`
    )
    .all(page) as unknown as Article[];
  return rows;
}

/**
 * Drop aged rows and cap per-page volume so the cache stays bounded.
 * Called after successful fetches; bookmarks live in a separate table.
 */
export function pruneArticles(options?: { maxAgeDays?: number; maxPerPage?: number }): void {
  const maxAgeDays = options?.maxAgeDays ?? 7;
  const maxPerPage = options?.maxPerPage ?? 200;

  db.prepare(
    `DELETE FROM articles
     WHERE fetched_at IS NOT NULL
       AND fetched_at < datetime('now', ?)`
  ).run(`-${maxAgeDays} days`);

  const pages = db
    .prepare("SELECT DISTINCT page FROM articles")
    .all() as unknown as Array<{ page: string }>;

  const deleteStale = db.prepare(
    `DELETE FROM articles
     WHERE page = ? AND id NOT IN (
       SELECT id FROM articles WHERE page = ?
       ORDER BY fetched_at DESC
       LIMIT ?
     )`
  );

  const run = db.transaction(() => {
    for (const { page } of pages) {
      deleteStale.run(page, page, maxPerPage);
    }
  });
  run();
}

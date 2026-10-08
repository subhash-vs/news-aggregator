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

// Synchronous sleep (Atomics.wait blocks the thread)
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Set busy_timeout FIRST so subsequent pragmas wait on locks
function retryExec(sql: string, retries = 10, delayMs = 200): void {
  for (let i = 0; i < retries; i++) {
    try {
      db.exec(sql);
      return;
    } catch (err: unknown) {
      if (i === retries - 1) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("locked") && !msg.includes("busy")) throw err;
      sleepSync(delayMs);
    }
  }
}

retryExec("PRAGMA busy_timeout = 5000");
retryExec("PRAGMA journal_mode = WAL");

retryExec(`
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
  CREATE INDEX IF NOT EXISTS idx_articles_page_fetched ON articles(page, fetched_at);

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    article_json TEXT NOT NULL,
    saved_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS source_tops (
    feed_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    publisher TEXT NOT NULL,
    kind TEXT NOT NULL,
    fidelity TEXT,
    feed_url TEXT,
    page TEXT,
    articles_json TEXT NOT NULL,
    error TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS http_validators (
    url TEXT PRIMARY KEY,
    etag TEXT,
    last_modified TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
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

/* ------------------- Hoisted prepared statements (hot paths) -------------------
 * node:sqlite re-parses SQL on every prepare() call. These statements run on
 * every request and every feed fetch — preparing them once at module load
 * instead of per call removes that per-call overhead from the hot loops.
 */

const stmtGetValidator = db.prepare(
  "SELECT etag, last_modified FROM http_validators WHERE url = ?"
);

const stmtSaveValidator = db.prepare(`
  INSERT INTO http_validators (url, etag, last_modified, updated_at)
  VALUES ($url, $etag, $lastModified, datetime('now'))
  ON CONFLICT(url) DO UPDATE SET
    etag = excluded.etag,
    last_modified = excluded.last_modified,
    updated_at = excluded.updated_at
`);

const stmtTouchFetchedAt = db.prepare(
  "UPDATE articles SET fetched_at = ? WHERE page = ? AND source = ?"
);

const stmtUpsertArticle = db.prepare(`
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
`);

const stmtGetArticlesByPage = db.prepare(
  `SELECT id, page, category, source, title, url, thumbnail, published_at as publishedAt, fetched_at as fetchedAt, score, summary
   FROM articles WHERE page = ? ORDER BY published_at DESC`
);

const stmtNewestFetchedAt = db.prepare(
  "SELECT MAX(fetched_at) AS newest FROM articles WHERE page = ?"
);

const stmtGlobalNewestFetchedAt = db.prepare(
  "SELECT MAX(fetched_at) AS newest FROM articles"
);

const stmtPruneByAge = db.prepare(
  `DELETE FROM articles
   WHERE fetched_at IS NOT NULL
     AND fetched_at < datetime('now', ?)`
);

const stmtDistinctPages = db.prepare("SELECT DISTINCT page FROM articles");

const stmtPruneStalePerPage = db.prepare(
  `DELETE FROM articles
   WHERE page = ? AND id NOT IN (
     SELECT id FROM articles WHERE page = ?
     ORDER BY fetched_at DESC
     LIMIT ?
   )`
);

/* --------------------- HTTP conditional-request cache --------------------- */

export interface HttpValidator {
  etag: string | null;
  lastModified: string | null;
}

export function getHttpValidator(url: string): HttpValidator | null {
  const row = stmtGetValidator.get(url) as
    | { etag: string | null; last_modified: string | null }
    | undefined;
  if (!row) return null;
  return { etag: row.etag, lastModified: row.last_modified };
}

export function saveHttpValidator(url: string, validator: HttpValidator): void {
  stmtSaveValidator.run({
    $url: url,
    $etag: validator.etag,
    $lastModified: validator.lastModified,
  });
}

/**
 * Bump fetched_at for a source's articles without re-writing content.
 * Used on HTTP 304 — the feed is unchanged, but its staleness clock resets.
 */
export function touchArticlesFetchedAt(page: string, source: string): void {
  stmtTouchFetchedAt.run(new Date().toISOString(), page, source);
}

export function upsertArticle(article: Article): void {
  stmtUpsertArticle.run({
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
  return stmtGetArticlesByPage.all(page) as unknown as Article[];
}

export function getNewestFetchedAtRaw(page: string): string | null {
  const row = stmtNewestFetchedAt.get(page) as { newest: string | null } | undefined;
  return row?.newest ?? null;
}

export function getGlobalNewestFetchedAtRaw(): string | null {
  const row = stmtGlobalNewestFetchedAt.get() as { newest: string | null } | undefined;
  return row?.newest ?? null;
}

/**
 * Drop aged rows and cap per-page volume so the cache stays bounded.
 * Called after successful fetches; bookmarks live in a separate table.
 */
export function pruneArticles(options?: { maxAgeDays?: number; maxPerPage?: number }): void {
  const maxAgeDays = options?.maxAgeDays ?? 1;
  const maxPerPage = options?.maxPerPage ?? 200;

  stmtPruneByAge.run(`-${maxAgeDays} days`);

  const pages = stmtDistinctPages.all() as unknown as Array<{ page: string }>;

  const run = db.transaction(() => {
    for (const { page } of pages) {
      stmtPruneStalePerPage.run(page, page, maxPerPage);
    }
  });
  run();
}

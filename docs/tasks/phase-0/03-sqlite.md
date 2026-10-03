# Brief 0.3 — SQLite database

## What you achieve
SQLite database with `config` and `articles` tables. Seed data with default config.

## Goal
Database ready for config storage and article caching.

## Context
Match ARCHITECTURE.md schema. Use `better-sqlite3` for sync operations.

## Do
- Create `src/lib/db.ts`:
  - Initialize SQLite at `data/news.db`
  - Create `config` table (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)
  - Create `articles` table with indexes on `page` and `fetched_at`
  - Export `db` instance
- Create `src/lib/seed.ts`:
  - Insert default config (4 pages with default sources)
  - Run on first startup or `npm run db:seed`
- Add `db:seed` and `db:reset` scripts to package.json

## Don't
Fetchers, API routes, UI.

## Files
`src/lib/db.ts`, `src/lib/seed.ts`, `package.json`

## Verify
Database file exists after seed. Tables created. Default config inserted.

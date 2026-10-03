# Brief 1.1 — Cache layer

## What you achieve
Article caching in SQLite with stale-while-revalidate logic.

## Goal
Avoid redundant API calls. Serve cached articles, refresh in background.

## Context
Every page load triggers fetches. Cache prevents hitting rate limits.

## Do
- Create `src/lib/cache.ts`:
  - `getCachedArticles(page: string): Article[]`
  - `upsertArticles(page: string, articles: Article[]): void`
  - `isCacheStale(page: string, maxAgeMinutes?: number): boolean`
  - Default max age: 30 minutes
- Update `src/lib/db.ts`:
  - Add `upsertArticle` helper (INSERT OR REPLACE)
  - Add `getArticlesByPage` query

## Don't
API routes, UI, fetchers.

## Files
`src/lib/cache.ts`, `src/lib/db.ts`

## Verify
Cache stores articles. Stale check works. Upsert handles duplicates.

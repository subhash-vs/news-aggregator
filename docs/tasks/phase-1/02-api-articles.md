# Brief 1.2 — Articles API route

## What you achieve
API endpoint that returns articles for a page, with caching.

## Goal
`GET /api/articles?page=world` returns fresh or cached articles.

## Context
Frontend calls this to populate each page.

## Do
- Create `src/app/api/articles/route.ts`:
  - Accept `page` query param (world, technology, movies, sports)
  - Check cache first
  - If stale or empty: fetch from all enabled sources for that page
  - Upsert results to cache
  - Return articles sorted by publishedAt (newest first)
- Create `src/app/api/articles/refresh/route.ts`:
  - POST endpoint to force refresh
  - Accept optional `page` param (refresh all if omitted)

## Don't
Config routes, UI.

## Files
`src/app/api/articles/route.ts`, `src/app/api/articles/refresh/route.ts`

## Verify
`curl /api/articles?page=world` returns articles. Cache populated.

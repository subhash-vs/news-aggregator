# Brief 2.6 — Custom RSS feeds

## What you achieve
Add custom RSS feeds to any page via settings.

## Goal
User extends sources with any RSS feed URL.

## Context
Fixed sources + custom feeds = flexible aggregation.

## Do
- Create `src/components/settings/CustomFeedConfig.tsx`:
  - Page selector
  - "Add feed" form (name, URL)
  - List of custom feeds with edit/delete
- Update fetcher:
  - Load custom feeds from config
  - Fetch alongside built-in sources
- Update API:
  - `POST /api/config/feeds` — add/edit/delete custom feed

## Don't
Feed validation (beyond URL format), feed health checks.

## Files
`src/components/settings/CustomFeedConfig.tsx`, `src/lib/fetchers/rss.ts`, `src/app/api/config/route.ts`

## Verify
Add custom feed. Articles appear. Edit/delete works.

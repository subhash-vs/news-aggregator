# Brief 3.7 — Source fallback and reliability

## What you achieve
Graceful handling of source failures with cached fallback.

## Goal
App always shows something. Cached articles served if source fails.

## Context
Sources go down. App must remain usable.

## Do
- Update fetchers:
  - Each fetcher returns `{ articles: Article[], error?: string }`
  - Partial results on partial failure
- Update cache:
  - Serve stale articles with "May be outdated" badge
  - Show last successful fetch time
- Update UI:
  - Per-source status indicator (green/yellow/red)
  - "Some sources unavailable" banner
  - Never show blank page if cache exists

## Don't
Monitoring dashboard, alerts.

## Files
`src/lib/fetchers/*.ts`, `src/lib/cache.ts`, all page files

## Verify
Kill one source. App shows cached + other sources. Status indicators work.

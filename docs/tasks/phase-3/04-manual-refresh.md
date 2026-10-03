# Brief 3.4 — Manual refresh

## What you achieve
Refresh button on each page to force fetch.

## Goal
User can manually update articles without page reload.

## Context
Auto-refresh is Phase 3.5. Manual is needed first.

## Do
- Update `PageHeader.tsx`:
  - Add refresh button (rotate icon)
  - Loading spinner while fetching
  - Disable during fetch
- Update pages:
  - Call `/api/articles/refresh?page=X` on click
  - Update article list with results

## Don't
Auto-refresh, background refresh.

## Files
`src/components/PageHeader.tsx`, all page files

## Verify
Click refresh. Spinner shows. Articles update.

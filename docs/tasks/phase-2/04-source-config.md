# Brief 2.4 — Source configuration

## What you achieve
Enable/disable sources per page in settings.

## Goal
User controls which sources appear on each page.

## Context
Each page has multiple sources. User picks which are active.

## Do
- Create `src/components/settings/SourceConfig.tsx`:
  - Page selector dropdown
  - List of available sources for that page
  - Toggle switch per source
  - Source details (type, URL, last fetched)
- Update API:
  - `POST /api/config/sources` — toggle source for a page

## Don't
Add/remove sources (fixed set for MVP), categories.

## Files
`src/components/settings/SourceConfig.tsx`, `src/app/api/config/route.ts`

## Verify
Toggle sources. Config saved. Articles fetched from enabled sources only.

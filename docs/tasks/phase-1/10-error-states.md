# Brief 1.10 — Error and loading states

## What you achieve
Graceful handling of loading, errors, and empty states.

## Goal
No crashes. Clear feedback when sources fail or are empty.

## Context
Sources can go down. Feeds can be empty. UI must handle all cases.

## Do
- Add loading states to all pages:
  - Skeleton grid while fetching
  - Spinner on refresh button
- Add error states:
  - "Failed to load articles" with retry button
  - Show cached articles if available
- Add empty states:
  - "No articles found" with helpful message
- Add `src/components/LoadingGrid.tsx`:
  - Skeleton cards matching ArticleCard layout
- Update API routes:
  - Graceful error handling per source
  - Return partial results if some sources fail

## Don't
New features, configuration.

## Files
`src/components/LoadingGrid.tsx`, all page files, `src/app/api/articles/route.ts`

## Verify
Simulate source failure. Cached articles shown. Errors logged.

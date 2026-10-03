# Brief 1.8 — Sports page

## What you achieve
Sports news page with configurable types (Cricket, F1, etc.).

## Goal
Fetch and display Sports articles.

## Context
Uses Reddit r/cricket, r/formula1, ESPN RSS. Sub-categories configurable.

## Do
- Create `src/app/(app)/sports/page.tsx`:
  - Fetch articles from `/api/articles?page=sports`
  - Display in `ArticleGrid`
  - `PageHeader` with "Sports" title
  - Group by sub-category (Cricket, F1, Football, etc.)

## Don't
Configuration UI, other pages.

## Files
`src/app/(app)/sports/page.tsx`

## Verify
Page loads. Articles display. Sub-categories visible.

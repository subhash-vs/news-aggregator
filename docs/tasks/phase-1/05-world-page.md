# Brief 1.5 — World page

## What you achieve
World news page displaying global conflicts, US politics, India politics.

## Goal
Fetch and display World articles in a clean layout.

## Context
First page. Uses Guardian API for world/politics news.

## Do
- Create `src/app/(app)/page.tsx`:
  - Fetch articles from `/api/articles?page=world`
  - Display in `ArticleGrid`
  - `PageHeader` with "World" title
  - Show loading state while fetching
  - Show empty state if no articles
  - Group by sub-category if categories exist (Politics, Conflicts, etc.)

## Don't
Other pages, configuration.

## Files
`src/app/(app)/page.tsx`

## Verify
Page loads. Articles display. Responsive layout.

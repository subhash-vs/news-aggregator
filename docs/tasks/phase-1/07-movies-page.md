# Brief 1.7 — Movies page

## What you achieve
Movies news page displaying Hollywood and Indian cinema news.

## Goal
Fetch and display Movies articles.

## Context
Uses Reddit r/movies, r/Bollywood, Guardian Films RSS.

## Do
- Create `src/app/(app)/movies/page.tsx`:
  - Fetch articles from `/api/articles?page=movies`
  - Display in `ArticleGrid`
  - `PageHeader` with "Movies" title
  - Group by sub-category (Hollywood, Bollywood, etc.)

## Don't
Configuration, other pages.

## Files
`src/app/(app)/movies/page.tsx`

## Verify
Page loads. Articles display. Sub-categories visible.

# Brief 1.6 — Technology page

## What you achieve
Technology news page displaying AI trends and tech news.

## Goal
Fetch and display Technology articles.

## Context
Uses HN API, TechCrunch RSS, The Verge RSS, ArsTechnica RSS.

## Do
- Create `src/app/(app)/technology/page.tsx`:
  - Fetch articles from `/api/articles?page=technology`
  - Display in `ArticleGrid`
  - `PageHeader` with "Technology" title
  - Group by sub-category (AI, Software, Hardware, etc.)

## Don't
Configuration, other pages.

## Files
`src/app/(app)/technology/page.tsx`

## Verify
Page loads. Articles from multiple sources display.

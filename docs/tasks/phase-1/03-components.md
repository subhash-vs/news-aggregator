# Brief 1.3 — Article components

## What you achieve
Reusable UI components for displaying articles.

## Goal
NYT-style card and grid components. Clean typography.

## Context
These components are reused across all 4 pages.

## Do
- Create `src/components/ArticleCard.tsx`:
  - Thumbnail (or placeholder)
  - Source badge
  - Title (serif font)
  - Published time (relative: "2 hours ago")
  - Link to original URL (opens in new tab)
- Create `src/components/ArticleGrid.tsx`:
  - Responsive grid layout (1-col mobile, 2-col tablet, 3-col desktop)
  - Renders `ArticleCard[]`
- Create `src/components/SourceBadge.tsx`:
  - Small pill showing source name
  - Color-coded by source type
- Create `src/components/PageHeader.tsx`:
  - Page title
  - Last updated timestamp
  - Refresh button

## Don't
Page-specific layouts, nav, settings.

## Files
`src/components/ArticleCard.tsx`, `src/components/ArticleGrid.tsx`, `src/components/SourceBadge.tsx`, `src/components/PageHeader.tsx`

## Verify
Components render in Storybook or dev preview. Responsive.

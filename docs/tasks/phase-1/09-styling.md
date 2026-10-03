# Brief 1.9 — Styling polish

## What you achieve
NYT-inspired typography and visual polish across all pages.

## Goal
Clean, editorial design. Serif headlines, proper spacing, subtle borders.

## Context
Functional pages exist. Now make them look professional.

## Do
- Update global styles (`src/app/globals.css`):
  - Serif font for headlines
  - Sans-serif for body text
  - Proper line heights and spacing
  - Subtle card shadows/borders
- Update `tailwind.config.ts`:
  - Editorial color palette
  - Font families
- Polish `ArticleCard`:
  - Thumbnail aspect ratio
  - Source badge positioning
  - Hover states
- Polish `ArticleGrid`:
  - Responsive breakpoints
  - Gap sizing

## Don't
New features, dark mode.

## Files
`src/app/globals.css`, `tailwind.config.ts`, `src/components/ArticleCard.tsx`, `src/components/ArticleGrid.tsx`

## Verify
Visual review. Typography matches NYT style. Responsive.

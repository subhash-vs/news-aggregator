# Brief 3.2 — Responsive layout

## What you achieve
Mobile-first responsive design across all pages.

## Goal
Read comfortably on phone, tablet, and desktop.

## Context
Users read news on mobile. Layout must adapt.

## Do
- Update `ArticleGrid`:
  - Mobile: single column, full-width cards
  - Tablet: 2 columns
  - Desktop: 3 columns
- Update navigation:
  - Mobile: hamburger menu or bottom nav
  - Desktop: top nav
- Update settings:
  - Stack form fields on mobile
  - Full-width inputs
- Test all breakpoints

## Don't
Dark mode (done in 3.1), new features.

## Files
`src/components/ArticleGrid.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/settings/page.tsx`

## Verify
Test on mobile viewport. All content accessible. No horizontal scroll.

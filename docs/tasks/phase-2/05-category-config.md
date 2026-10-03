# Brief 2.5 — Category configuration

## What you achieve
Add/edit sub-categories per page in settings.

## Goal
User defines sub-categories (e.g., Cricket, F1 under Sports).

## Context
Categories group articles within a page. Keywords filter articles.

## Do
- Create `src/components/settings/CategoryConfig.tsx`:
  - Page selector dropdown
  - List of categories for that page
  - Add/edit/delete category
  - Keywords input (comma-separated)
  - Toggle enable/disable
- Update API:
  - `POST /api/config/categories` — add/edit/delete category

## Don't
Article filtering logic (already done in Phase 1), styling polish.

## Files
`src/components/settings/CategoryConfig.tsx`, `src/app/api/config/route.ts`

## Verify
Add category. Edit keywords. Delete category. Config persisted.

# Brief 3.3 — Bookmarks

## What you achieve
Save articles for later reading.

## Goal
User can bookmark articles and view saved list.

## Context
Common feature for news apps. Simple for MVP.

## Do
- Create `src/lib/db.ts` update:
  - Add `bookmarks` table (article_id, saved_at)
- Create `src/components/BookmarkButton.tsx`:
  - Toggle bookmark on any ArticleCard
  - Visual indicator (filled/outline icon)
- Create `src/app/(app)/bookmarks/page.tsx`:
  - List of saved articles
  - Remove bookmark option
- Update API:
  - `POST /api/bookmarks` — add/remove
  - `GET /api/bookmarks` — list saved

## Don't
Read-later integration, offline support.

## Files
`src/lib/db.ts`, `src/components/BookmarkButton.tsx`, `src/app/(app)/bookmarks/page.tsx`, `src/app/api/bookmarks/route.ts`

## Verify
Bookmark article. View in bookmarks page. Remove works.

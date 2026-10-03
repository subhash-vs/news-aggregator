# Brief 2.3 — Page reorder

## What you achieve
Drag-and-drop page reordering in settings.

## Goal
User can reorder pages. Order persists and updates navigation.

## Context
Pages displayed in configured order across the app.

## Do
- Create `src/components/settings/PageReorder.tsx`:
  - List of pages with drag handles
  - Up/down buttons (simpler than DnD for MVP)
  - Toggle enable/disable per page
- Update navigation:
  - Read page order from config
  - Render nav links in configured order

## Don't
Source configuration, categories.

## Files
`src/components/settings/PageReorder.tsx`, `src/app/(app)/layout.tsx`

## Verify
Reorder pages. Nav updates. Order persists after refresh.

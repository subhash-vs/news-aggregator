# Brief 2.2 — Settings page layout

## What you achieve
Settings page with tabs for Pages, Sources, and Categories.

## Goal
Access point for all configuration. Clean, organized layout.

## Context
User configures everything from this page.

## Do
- Create `src/app/(app)/settings/page.tsx`:
  - Tab navigation: Pages | Sources | Categories
  - Save/Cancel buttons
  - "Reset to defaults" option
- Create `src/components/settings/SettingsLayout.tsx`:
  - Tab container
  - Content area
  - Action bar

## Don't
Tab content (done in 2.3–2.5), styling polish.

## Files
`src/app/(app)/settings/page.tsx`, `src/components/settings/SettingsLayout.tsx`

## Verify
Settings page renders. Tabs switch content.

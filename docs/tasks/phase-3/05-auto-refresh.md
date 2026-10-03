# Brief 3.5 — Auto-refresh

## What you achieve
Configurable auto-refresh interval per page.

## Goal
Articles update automatically at user-defined intervals.

## Context
Daily readers want fresh content without clicking.

## Do
- Create `src/components/AutoRefreshSettings.tsx`:
  - Interval selector (5, 15, 30, 60 minutes, off)
  - Per-page setting
- Update pages:
  - Use `setInterval` to trigger refresh
  - Respect page visibility (pause when tab hidden)
  - Show "Updated X minutes ago" indicator
- Persist interval in config

## Don't
Push notifications, background workers.

## Files
`src/components/AutoRefreshSettings.tsx`, all page files, `src/lib/config.ts`

## Verify
Set interval. Timer fires. Articles update. Pauses when tab hidden.

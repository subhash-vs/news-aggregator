# Brief 3.6 — Loading and error polish

## What you achieve
Refined loading, error, and empty states across the app.

## Goal
Professional-grade UX feedback. No jarring states.

## Context
Phase 1 added basic states. This polishes them.

## Do
- Refine `LoadingGrid.tsx`:
  - Match actual card layout precisely
  - Shimmer animation
  - Smooth transition to content
- Refine error states:
  - Inline errors per source (not page-level)
  - "Some sources failed" partial display
  - Retry per failed source
- Refine empty states:
  - Illustration or icon
  - Helpful text: "No articles yet. Try refreshing."
- Add toast notifications:
  - "Config saved"
  - "Refresh complete"
  - "3 articles added"

## Don't
New features, layout changes.

## Files
`src/components/LoadingGrid.tsx`, `src/components/Toast.tsx`, all page files

## Verify
Visual review. All states look polished. Transitions smooth.

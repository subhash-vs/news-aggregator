# Brief 3.1 — Dark mode

## What you achieve
Dark/light mode toggle with system preference detection.

## Goal
Comfortable reading in any lighting. Respects OS preference.

## Context
NYT has dark mode. This matches that standard.

## Do
- Create `src/components/ThemeToggle.tsx`:
  - Toggle button (sun/moon icon)
  - Persists preference in localStorage
  - Detects system preference on first load
- Update `tailwind.config.ts`:
  - Dark mode class strategy
  - Dark palette (dark backgrounds, light text)
- Update all components:
  - Add `dark:` variants
  - Ensure contrast ratios

## Don't
New features, layout changes.

## Files
`src/components/ThemeToggle.tsx`, `tailwind.config.ts`, all component files

## Verify
Toggle works. Preference persists. System preference detected. Contrast OK.

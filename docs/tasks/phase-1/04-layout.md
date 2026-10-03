# Brief 1.4 — Root layout and navigation

## What you achieve
App shell with navigation to 4 pages. NYT-inspired styling.

## Goal
Clean editorial layout with top nav. Serif fonts, proper spacing.

## Context
Layout wraps all pages. Navigation matches ROADMAP page order.

## Do
- Update `src/app/layout.tsx`:
  - Import serif font (Playfair Display or similar from Google Fonts)
  - Top navigation bar with page links
  - NYT-style header with app name
  - Footer with "Powered by..." text
- Create `src/app/(app)/layout.tsx`:
  - Shared layout for all pages
  - Navigation state (active page highlight)
- Add Tailwind config for:
  - Serif font family
  - Editorial color palette (dark text, light background)

## Don't
Page content, settings, dark mode.

## Files
`src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `tailwind.config.ts`

## Verify
App renders with nav. Links work. Typography matches NYT style.

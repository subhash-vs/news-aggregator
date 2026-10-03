# Brief 0.2 — Shared types

## What you achieve
TypeScript types for articles, sources, pages, and config. Single source of truth.

## Goal
Define all data models in `src/types/index.ts` before any implementation.

## Context
Types drive the entire app. Must match ARCHITECTURE.md config schema.

## Do
- Create `src/types/index.ts` with:
  - `Article` (id, page, category, source, title, url, thumbnail, publishedAt, fetchedAt)
  - `Source` (id, type, name, enabled, config)
  - `Page` (id, label, order, enabled, sources, categories)
  - `Category` (id, label, enabled, keywords)
  - `AppConfig` (pages)
  - `SourceConfig` (type-specific: GuardianKey, HNConfig, RedditConfig, RSSConfig)
- Export all types

## Don't
Implementation, API types, component props.

## Files
`src/types/index.ts`

## Verify
`npx tsc --noEmit` passes.

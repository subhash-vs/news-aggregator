# Brief 2.1 — Config API route

## What you achieve
API endpoints for reading and writing app configuration.

## Goal
`GET /api/config` returns config. `POST /api/config` saves config.

## Context
Settings page calls these. Config persisted in SQLite.

## Do
- Create `src/app/api/config/route.ts`:
  - `GET /api/config` — return current config from DB
  - `POST /api/config` — validate and save config
  - `PUT /api/config/pages/reorder` — update page order
- Create `src/lib/config.ts`:
  - `getConfig(): AppConfig`
  - `saveConfig(config: AppConfig): void`
  - `reorderPages(pageIds: string[]): void`
  - `toggleSource(pageId: string, sourceId: string): void`
  - `toggleCategory(pageId: string, categoryId: string): void`

## Don't
UI, validation beyond basic schema check.

## Files
`src/app/api/config/route.ts`, `src/lib/config.ts`

## Verify
`curl /api/config` returns default config. POST saves changes.

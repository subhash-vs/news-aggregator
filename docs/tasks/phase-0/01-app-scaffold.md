# Brief 0.1 — App scaffold

## What you achieve
`npm run dev` works. Lint passes. Project structure matches ARCHITECTURE.md.

## Goal
Runnable Next.js 16 App Router app with TS, Tailwind v4, ESLint. No product logic.

## Context
Project was scaffolded with `create-next-app`. Verify scripts, add `better-sqlite3`, `rss-parser`.

## Do
- Verify `package.json` scripts: `dev`, `build`, `lint`, `test`
- Add dependencies: `better-sqlite3`, `rss-parser`
- Add dev dependencies: `@types/better-sqlite3`
- Verify `.gitignore` includes `data/*.db`, `.env.local`
- Verify Tailwind v4 is configured
- Create `data/` directory

## Don't
Auth, UI components, API routes, database schema.

## Files
`package.json`, `.gitignore`

## Verify
`npm run dev` starts. `npm run lint` passes.

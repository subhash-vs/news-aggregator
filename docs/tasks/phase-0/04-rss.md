# Brief 0.4 — RSS parser utility

## What you achieve
Generic RSS feed parser that returns `Article[]`.

## Goal
Wrap `rss-parser` in a utility that handles errors and normalizes output.

## Context
Used by TechCrunch, The Verge, ArsTechnica, Wired feeds.

## Do
- Create `src/lib/fetchers/rss.ts`:
  - `fetchRSS(url: string, source: string, page: string): Promise<Article[]>`
  - Parse feed, map items to Article type
  - Handle errors gracefully (return empty array, log)
  - Normalize dates to ISO strings
  - Extract thumbnail from `enclosure` or `media:thumbnail`

## Don't
Guardian, HN, Reddit fetchers. Caching. UI.

## Files
`src/lib/fetchers/rss.ts`

## Verify
Manually test with a known RSS feed URL.

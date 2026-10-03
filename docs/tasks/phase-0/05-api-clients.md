# Brief 0.5 — API client utilities

## What you achieve
Fetcher functions for Guardian, Hacker News, and Reddit APIs.

## Goal
Each fetcher returns normalized `Article[]` and handles errors gracefully.

## Context
Guardian needs API key. HN is Firebase. Reddit uses `.json` suffix.

## Do
- Create `src/lib/fetchers/guardian.ts`:
  - `fetchGuardian(section: string, page: string): Promise<Article[]>`
  - Use Guardian Open API (`content.guardianapis.com`)
  - API key from `GUARDIAN_API_KEY` env var
  - Map to Article type
- Create `src/lib/fetchers/hackernews.ts`:
  - `fetchHN(topN?: number): Promise<Article[]>`
  - Fetch top stories from HN Firebase API
  - Limit to top 20 by default
- Create `src/lib/fetchers/reddit.ts`:
  - `fetchReddit(subreddit: string, page: string): Promise<Article[]>`
  - Use `https://www.reddit.com/r/{subreddit}.json`
  - Map to Article type
- Create `src/lib/fetchers/index.ts`:
  - Export all fetchers
  - `fetchFromSource(source: Source, page: string): Promise<Article[]>` dispatcher

## Don't
Caching, API routes, UI, RSS (done in 0.4).

## Files
`src/lib/fetchers/guardian.ts`, `src/lib/fetchers/hackernews.ts`, `src/lib/fetchers/reddit.ts`, `src/lib/fetchers/index.ts`

## Verify
Each fetcher returns articles when called manually. Errors logged, not thrown.

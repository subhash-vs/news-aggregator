# Technical Architecture

## Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         Next.js 16 (App Router)                  │
│         Tailwind v4 + Lucide                     │
│         NYT-style editorial layout               │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                API Layer                         │
│         /api/articles                            │
│         /api/config                              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│             Fetch Layer                          │
│    ┌──────────┬──────────┬──────────┐           │
│    │ Guardian │   HN     │  Reddit  │           │
│    │   API    │   API    │  JSON    │           │
│    └──────────┴──────────┴──────────┘           │
│    ┌──────────────────────────────────┐         │
│    │        RSS Parser                │         │
│    │  TechCrunch, Verge, Ars, Wired   │         │
│    └──────────────────────────────────┘         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Data Layer                          │
│         SQLite (better-sqlite3)                  │
│    ┌──────────────┬──────────────┐              │
│    │    config    │   articles   │              │
│    │  (pages,     │  (cache,     │              │
│    │   sources,   │   metadata)  │              │
│    │   order)     │              │              │
│    └──────────────┴──────────────┘              │
└─────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Existing expertise, SSR for fast loads |
| Language | TypeScript | Type safety, existing patterns |
| Styling | Tailwind v4 + Lucide | Matches portfolio-tracker |
| Database | SQLite (better-sqlite3) | Zero config, local, fast |
| RSS | `rss-parser` npm package | Mature, handles edge cases |
| Hosting | Vercel / Railway | Free tier, zero ops |

---

## Database schema

### config
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Stores JSON-serialized config:
- `pages` — ordered array of page definitions
- `sources` — per-page source enable/disable
- `categories` — per-page sub-categories

### articles
```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  category TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  published_at TEXT,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_articles_page ON articles(page);
CREATE INDEX idx_articles_fetched ON articles(fetched_at);
```

---

## Config schema (JSON)

```typescript
interface AppConfig {
  pages: Page[];
}

interface Page {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  sources: Source[];
  categories: Category[];
}

interface Source {
  id: string;
  type: 'guardian' | 'hn' | 'reddit' | 'rss';
  name: string;
  enabled: boolean;
  config: Record<string, string>; // API key, subreddit, feed URL, etc.
}

interface Category {
  id: string;
  label: string;
  enabled: boolean;
  keywords: string[]; // for filtering
}
```

---

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/articles` | GET | Fetch articles (by page, cached or fresh) |
| `/api/articles/refresh` | POST | Force refresh all or specific page |
| `/api/config` | GET | Read current config |
| `/api/config` | POST | Save config |
| `/api/sources` | GET | List available sources |

---

## Fetch strategy

```
Request → Check cache (articles table)
  → Cache hit & fresh (< 30 min): return cached
  → Cache stale or miss: fetch from source
    → Success: update cache, return fresh
    → Failure: return cached with stale flag
```

---

## File structure

```
news-aggregator/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # Root layout with nav
│   │   │   ├── page.tsx            # Home/World page
│   │   │   ├── technology/page.tsx
│   │   │   ├── movies/page.tsx
│   │   │   ├── sports/page.tsx
│   │   │   └── settings/page.tsx   # Configuration
│   │   └── api/
│   │       ├── articles/route.ts
│   │       ├── articles/refresh/route.ts
│   │       └── config/route.ts
│   ├── components/
│   │   ├── ui/                     # Shared primitives
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleGrid.tsx
│   │   ├── PageHeader.tsx
│   │   └── SourceBadge.tsx
│   ├── lib/
│   │   ├── db.ts                   # SQLite connection
│   │   ├── fetchers/
│   │   │   ├── guardian.ts
│   │   │   ├── hackernews.ts
│   │   │   ├── reddit.ts
│   │   │   └── rss.ts
│   │   ├── cache.ts                # Cache logic
│   │   └── config.ts               # Config read/write
│   └── types/
│       └── index.ts
├── data/
│   └── news.db                     # SQLite database
├── docs/
│   ├── PRD.md
│   ├── ROADMAP.md
│   └── ARCHITECTURE.md
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Performance considerations

- RSS feeds are parsed server-side to avoid CORS
- Articles cached in SQLite to minimize API calls
- Stale-while-revalidate pattern: show cached, fetch in background
- Guardian API: 12 req/s is generous — no special handling needed
- HN API: Firebase, no rate limit documented — fetch top stories only
- Reddit: `.json` suffix on any subreddit URL — 60 req/min limit

---

## Error handling

| Scenario | Behavior |
|----------|----------|
| Source down | Skip source, show other sources |
| RSS malformed | Log error, skip feed |
| API rate limited | Serve cached, retry later |
| DB write fail | Log, continue (in-memory fallback) |
| Config invalid | Show default config, prompt user |

---

## Security

- No user auth (single user)
- No secrets in client-side code
- Guardian API key in env var only
- Reddit/HN/Guardian are public APIs
- RSS feeds are public
- SQLite file not committed to git (in .gitignore)

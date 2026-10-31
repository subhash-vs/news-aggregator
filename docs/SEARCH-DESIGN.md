# Title Search — Design

Roadmap item: **4.5 — Search across articles** (Phase 4). This doc is the plan.

---

## 1. Current state

| Fact | Where |
|------|-------|
| No search exists today | — |
| Client-side filtering precedent (publisher chips) | `src/components/SourceFilterChips.tsx` |
| A *different* "search" already exists: adds a live Google News RSS feed | `src/components/settings/CustomFeedConfig.tsx` |
| Articles cached in SQLite, pruned by age + per-page cap | `src/lib/db.ts` (`pruneArticles`), `src/lib/cache.ts` |
| Per-page serve pipeline (clean → dedupe → categorize → rank) with in-memory `ResponseCache` | `src/lib/articles.ts` |
| Page shell: sticky header with `Nav`, per-page `PageHeader` + refresh button | `src/app/(app)/layout.tsx`, `src/components/PageHeader.tsx` |

Data volume is small (single user, retention-bounded table) — a few thousand rows at most. That drives the core decision below: **filter in memory, no FTS index in v1**.

---

## 2. Goals / non-goals

**Goals (v1)**
- Type a keyword (or several) and instantly narrow the current page to matching **titles**.
- Search works against cached articles — no network round-trip, works while sources are down.
- Composes cleanly with the existing publisher-chip filter.
- Accessible: keyboard reachable, `Esc` clears, result count announced.

**Non-goals (v1)**
- Searching article bodies/summaries (titles only, per the request).
- Typo tolerance / fuzzy matching, stemming, synonyms.
- Search across publication *history* beyond what the pruned cache holds.
- Multi-user or persisted search history.

---

## 3. Approach — two stages

### Stage 1 — Per-page title filter (ship first, pure client-side)

Search box rendered under `PageHeader`, above the publisher chips. Filters the already-loaded `articles` array in memory.

**Matching semantics** (pure functions in new `src/lib/search.ts`):

1. Normalize: lowercase, replace punctuation with spaces, collapse whitespace.
2. Tokenize on whitespace. A quoted `"phrase"` stays one token.
3. Drop tokens shorter than 2 chars (unless the whole query is 1–2 chars — then use it as-is).
4. **AND** semantics: every token must appear in the title.
5. Ranking (for ordering results): phrase-in-title > all tokens in title > single-token hit. In practice Stage 1 keeps the page's existing rank order and only filters — ranking matters for Stage 2.

```ts
// src/lib/search.ts
export function normalizeQuery(q: string): string;
export function tokenize(q: string): string[];
export function titleMatches(title: string, tokens: string[]): boolean;
export function filterBySearch(articles: Article[], query: string): Article[];
```

**Wiring in `NewsPage.tsx`:**

```
filteredArticles = filterBySearch(filterByPublishers(articles, sourceFilter), query)
```

- Lead story is recomputed *after* filtering, so the top hit becomes the lead.
- Category grouping runs on the filtered set — groups with zero matches disappear.
- Query state is **ephemeral** (cleared on page change), unlike the publisher filter which persists in `sessionStorage`. A forgotten search box looking like a "broken page" is the main UX risk.

**UI details**
- Input with `Search` icon (lucide), debounced 150 ms, `aria-label="Search titles"`, clear (`×`) button, `Esc` to clear.
- Live result count line: `12 titles match "ai"` (reuses `meta-line` styling).
- Distinct empty state: "No titles match …" + Clear button — separate from the existing "No stories from selected sources" state so the two filters are never confused.
- Matches highlighted with `<mark>` in card titles (small `Highlight` component).

### Stage 2 — Global search overlay (follow-up)

Search icon in the sticky top bar → modal/overlay that searches **all enabled pages' cached articles**, not just the current page.

- New route `GET /api/search?q=…&limit=50` (min 2 chars, max 100 results).
- Server loads cached articles for enabled pages, reuses `dedupeArticles` + the Stage 1 matcher (single source of truth for matching), sorts by rank-then-recency.
- No SQL `LIKE`/FTS5 in v1 — the table is small and already pruned; add FTS5 only if profiling shows it's needed.
- UI: dialog with input + `ArticleGrid` of results, opened by icon click, `/` or `⌘K`, closes on `Esc`, focus trap, results labelled with their page.

---

## 4. Files

**Stage 1**
| File | Change |
|------|--------|
| `src/lib/search.ts` | **New** — normalize/tokenize/match/filter (pure, type-checked) |
| `src/components/SearchBox.tsx` | **New** — debounced input, clear, count line |
| `src/components/Highlight.tsx` | **New** — `<mark>` wrapper for matched tokens |
| `src/components/NewsPage.tsx` | Wire query state, compose filters, empty state |
| `src/components/PageHeader.tsx` | Optional: nothing, search sits below it |

**Stage 2**
| File | Change |
|------|--------|
| `src/app/api/search/route.ts` | **New** — GET endpoint |
| `src/lib/search.ts` | Add `searchAllPages()` server helper |
| `src/components/SearchOverlay.tsx` | **New** — dialog + results |
| `src/app/(app)/layout.tsx` | Add search icon button to top bar |

---

## 5. Verification

No test runner in this repo (`npm test` = `tsc --noEmit`), so:

1. `npm test` (type check) and `npm run lint`.
2. Manual: multi-word query ANDs correctly; `Esc`/clear works; search + publisher chips compose; empty states don't collide; lead story follows the filtered set; mobile layout of the search row.

---

## 6. Open decisions

| Decision | Recommendation |
|----------|----------------|
| Search summaries too, or titles only? | Titles only (per request); summary search is a one-line change later |
| Persist query across page navigation? | No — ephemeral |
| Stage 2 scope: current page or all pages? | All pages (that's the value-add over Stage 1) |
| Ship both stages at once? | No — Stage 1 is a small, safe diff; Stage 2 adds an API route and dialog |

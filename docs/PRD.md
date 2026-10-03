# NewsFlow — Product Requirements Document

## Document control

| Field | Value |
|---|---|
| Product | NewsFlow — NYT-Style News Aggregator |
| Version | 1.0 |
| Date | September 29, 2026 |
| Status | Initial draft |
| Audience | Product, engineering, design |

---

## 1. Executive summary

NewsFlow is a single-user news aggregation app that pulls articles from free news APIs and RSS feeds, displaying them in a clean NYT-style editorial layout. Users configure which pages exist, their order, and which sources feed each page.

No LLM rewriting — articles link to original sources.

---

## 2. Problem

Staying informed requires visiting multiple sites (TechCrunch, The Guardian, Reddit, Hacker News). There's no single clean view that aggregates across sources with a consistent editorial layout.

---

## 3. Product principles

1. **Links, not copies** — always link to the original source
2. **Configurable, not rigid** — users choose what goes where
3. **Clean typography** — NYT-inspired editorial design
4. **Free tier first** — zero cost for personal use
5. **Fast** — no LLM calls, just fetch and display

---

## 4. Pages

| Page | Content | Default Sources |
|------|---------|-----------------|
| **World** | Global conflicts, US politics, India politics | The Guardian API, Reuters RSS |
| **Technology** | AI trends, tech news | Hacker News API, TechCrunch RSS, The Verge RSS |
| **Movies** | Hollywood, Indian cinema | Reddit r/movies, Reddit r/Bollywood, The Guardian Films |
| **Sports** | Configurable types (Cricket, F1, etc.) | Reddit r/cricket, Reddit r/formula1, ESPN RSS |

---

## 5. Features

### 5.1 Article display
| ID | Requirement | Priority |
|----|-------------|----------|
| ART-01 | Show article title, source, published date, and thumbnail | P0 |
| ART-02 | Link to original article on click | P0 |
| ART-03 | Group articles by sub-category within a page | P1 |
| ART-04 | Show source favicon or logo | P2 |

### 5.2 Configuration
| ID | Requirement | Priority |
|----|-------------|----------|
| CFG-01 | Reorder pages via drag-and-drop or settings | P0 |
| CFG-02 | Enable/disable sources per page | P0 |
| CFG-03 | Add sub-categories per page (e.g., Cricket under Sports) | P0 |
| CFG-04 | Add custom RSS feeds | P1 |
| CFG-05 | Persist config in SQLite | P0 |

### 5.3 Refresh
| ID | Requirement | Priority |
|----|-------------|----------|
| REF-01 | Refresh articles on page load | P0 |
| REF-02 | Manual refresh button | P1 |
| REF-03 | Auto-refresh every N minutes (configurable) | P2 |
| REF-04 | Cache articles to avoid redundant fetches | P0 |

---

## 6. Users

### 6.1 Single user (you)
- Configures pages, sources, and categories once
- Reads news daily
- Expects NYT-quality typography and layout

---

## 7. Non-goals (Phase 1)

- Multi-user accounts
- LLM summarization or rewriting
- Bookmarks or read-later
- Social sharing
- Mobile app
- Dark mode

---

## 8. Data sources

### 8.1 Free APIs
| Source | Type | Rate Limit |
|--------|------|------------|
| The Guardian | REST API | 12 req/s, 500k/day |
| Hacker News | Firebase API | Unlimited |
| Reddit | JSON API (`.json`) | 60 req/min |

### 8.2 RSS Feeds
| Source | Feed URL |
|--------|----------|
| TechCrunch | techcrunch.com/feed |
| The Verge | theverge.com/rss/index.xml |
| ArsTechnica | arstechnica.com/feed |
| Wired | wired.com/feed/rss |
| ESPN | espn.com/espn/rss/news |

---

## 9. Non-functional requirements

### 9.1 Performance
- Page load: < 2s with cached articles
- Fresh fetch: < 5s per source
- RSS parse: < 1s per feed

### 9.2 Reliability
- Graceful fallback if a source is down
- Cache serves stale articles if refresh fails
- No crashes on malformed RSS

### 9.3 Hosting
- Vercel or Railway free tier
- SQLite for config and article cache
- No external database service

---

## 10. Future roadmap

| Phase | Capabilities |
|-------|-------------|
| Phase 2 | Dark mode, responsive polish, bookmarks |
| Phase 3 | Multi-user accounts, per-user config |
| Phase 4 | AI summaries, sentiment analysis |
| Phase 5 | Mobile app (PWA or React Native) |
| Phase 6 | Social features, source reliability scoring |

---

## 11. Success metrics

| Metric | Target |
|--------|--------|
| Sources loaded successfully | ≥ 90% on page load |
| Page load time (cached) | < 2s |
| Config save/load | < 500ms |
| Zero-cost hosting | Free tier sufficient |

---

## 12. Dependencies

| Dependency | Purpose | Failure behavior |
|------------|---------|------------------|
| Guardian API | World/Movies news | Graceful skip, show other sources |
| Hacker News API | Technology news | Graceful skip |
| Reddit JSON | Movies/Sports | Graceful skip |
| RSS feeds | Tech news | Graceful skip |

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| API rate limiting | Cache aggressively, respect limits |
| RSS feed changes | Parse defensively, log failures |
| Source downtime | Show cached articles, skip gracefully |
| CORS (NewsAPI) | Use Guardian + RSS instead |

---

## 14. Change log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | September 29, 2026 | Initial PRD |

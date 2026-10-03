# Product Roadmap

Capstone: **News Aggregator**. Local Next.js app. Single-user, NYT-style layout.

| | Phase 0 | Phase 1 — MVP | Phase 2 — Config | Phase 3 — Polish | Phase 4 — Future |
|---|---|---|---|---|---|
| When | Day 1 | Weeks 1–2 | Week 2–3 | Week 3–4 | Post-MVP |
| User can | Run empty app | View news on 4 pages | Configure pages, sources, categories | Dark mode, responsive, bookmarks | Multi-user, AI summaries |
| Not yet | Data | Config | Polish | Future features | — |

---

## Features by phase

### Phase 0 — Foundation
| Feature | Delivery |
|---------|----------|
| Next.js scaffold with TypeScript + Tailwind | 0.1 |
| Shared types (Article, Source, Page, Config) | 0.2 |
| SQLite setup (config + articles tables) | 0.3 |
| RSS parser utility | 0.4 |
| API client utilities (Guardian, HN, Reddit) | 0.5 |

### Phase 1 — MVP
| Feature | Delivery | User value |
|---------|----------|------------|
| Fetch articles from Guardian API | 1.1 | World news |
| Fetch articles from Hacker News API | 1.2 | Tech news |
| Fetch articles from Reddit JSON | 1.3 | Movies + Sports |
| Fetch articles from RSS feeds | 1.4 | TechCrunch, Verge, ArsTechnica |
| World page layout | 1.5 | View global/political news |
| Technology page layout | 1.6 | View AI/tech news |
| Movies page layout | 1.7 | View Hollywood/Bollywood news |
| Sports page layout | 1.8 | View cricket/F1 news |
| NYT-style typography and cards | 1.9 | Clean editorial design |
| Article cache in SQLite | 1.10 | Fast loads, no redundant fetches |

### Phase 2 — Configuration
| Feature | Delivery | User value |
|---------|----------|------------|
| Settings page | 2.1 | Access configuration |
| Reorder pages (drag-and-drop) | 2.2 | Personalize page order |
| Enable/disable sources per page | 2.3 | Control what appears where |
| Add sub-categories per page | 2.4 | Organize by topic (Cricket, F1) |
| Add custom RSS feeds | 2.5 | Extend with any source |
| Persist config to SQLite | 2.6 | Config survives restart |
| Config validation and error handling | 2.7 | Robust configuration |

### Phase 3 — Polish
| Feature | Delivery | User value |
|---------|----------|------------|
| Dark mode toggle | 3.1 | Night reading |
| Responsive layout (mobile/tablet) | 3.2 | Read anywhere |
| Bookmarks (save articles) | 3.3 | Read later |
| Manual refresh button | 3.4 | Force update |
| Auto-refresh interval | 3.5 | Stay current |
| Loading and error states | 3.6 | Graceful degradation |
| Source fallback (cached if down) | 3.7 | Reliable experience |

### Phase 4 — Future
| Feature | Delivery | User value |
|---------|----------|------------|
| Multi-user accounts | 4.1 | Shared deployment |
| Per-user configuration | 4.2 | Personalized per user |
| AI summaries (optional) | 4.3 | Quick reads |
| Sentiment analysis | 4.4 | Bias detection |
| Search across articles | 4.5 | Find anything |
| PWA / mobile app | 4.6 | Mobile access |
| Newsletter mode (email digest) | 4.7 | Inbox delivery |
| Social sharing | 4.8 | Share collections |
| Source reliability scoring | 4.9 | Quality signals |

---

## Explicitly later / never (Phase 1)
Multi-user auth, LLM rewriting, social features, mobile app, newsletter, paid tier.

---

## Phase justification

- **Phase 1 (MVP):** Prove the core value — fetch and display news from multiple sources in a clean layout. No config, no polish, just working data flow.
- **Phase 2 (Config):** Make it personal. User controls what they see and in what order. This is the core differentiator.
- **Phase 3 (Polish):** Production-quality UX. Dark mode, responsive, error handling. Ready for daily use.
- **Phase 4 (Future):** Scale features. Multi-user, AI, mobile. Only after core is solid.

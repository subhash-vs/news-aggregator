/**
 * Server instrumentation — runs once when the Next.js server starts.
 *
 * Keep-warm through the global fetch queue (max 3 concurrent, deduped,
 * circuit-broken):
 *  - Boot: enqueue every content page once so a restarted VM recovers fast.
 *    Safe to enqueue all at once — the queue caps concurrency, this does not.
 *  - Every 20 min: rotate ONE page and ONE publisher top-feed, so idle load
 *    stays tiny while every cache still refreshes within ~2-3h.
 *
 * Request handlers never fetch (they read SQLite); this timer plus explicit
 * user refreshes are the only things that enqueue work.
 */
const KEEP_WARM_INTERVAL_MS = 20 * 60 * 1000;
const INITIAL_DELAY_MS = 30_000;

export async function register(): Promise<void> {
  // Only run in the Node.js server runtime, never during build or edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Dev hot-reload can re-evaluate modules; keep a single timer per process.
  const g = globalThis as { __newsKeepWarm?: ReturnType<typeof setInterval> };
  if (g.__newsKeepWarm) return;

  const { getEnabledPages } = await import("@/lib/config");
  const { SPECIAL_PAGE_IDS } = await import("@/lib/constants");
  const { refreshPageInBackground } = await import("@/lib/articles");
  const { refreshAllSourceTops } = await import("@/lib/source-tops");
  const { SOURCE_TOP_FEEDS } = await import("@/lib/source-tops");

  const contentPages = () =>
    getEnabledPages().filter((p) => !SPECIAL_PAGE_IDS.has(p.id));

  let pageCursor = 0;
  let feedCursor = 0;

  const enqueueOnePage = (): void => {
    const pages = contentPages();
    if (pages.length === 0) return;
    const page = pages[pageCursor % pages.length];
    pageCursor += 1;
    void refreshPageInBackground(page.id).catch(() => {});
  };

  const tick = (): void => {
    try {
      enqueueOnePage();
      // Rotate publisher feeds one per tick as well.
      if (SOURCE_TOP_FEEDS.length > 0) {
        feedCursor += 1;
        // refreshAllSourceTops enqueues through the same deduped queue,
        // so calling it is harmless; the circuit breaker skips cooling feeds.
        if (feedCursor % 3 === 0) {
          refreshAllSourceTops();
        }
      }
    } catch (error) {
      console.error("[keep-warm] tick failed:", error);
    }
  };

  g.__newsKeepWarm = setInterval(tick, KEEP_WARM_INTERVAL_MS);

  // First warm-up shortly after boot: enqueue everything at once. The global
  // fetch queue drains it at max 3 concurrent — no socket storm possible.
  setTimeout(() => {
    try {
      for (const _page of contentPages()) {
        enqueueOnePage();
      }
      refreshAllSourceTops();
    } catch (error) {
      console.error("[keep-warm] initial warm-up failed:", error);
    }
  }, INITIAL_DELAY_MS);
}

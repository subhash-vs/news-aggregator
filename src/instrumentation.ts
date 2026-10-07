/**
 * Server instrumentation — runs once when the Next.js server starts.
 *
 * Keep-warm: refresh ONE page per tick (round-robin), every 20 minutes.
 * Rotating instead of re-fetching every source on every cycle cuts idle
 * load ~6× on the 512MB VM; stale-while-revalidate covers the gap whenever
 * someone actually visits. Full coverage lands within ~2h — far inside the
 * 24h article retention, so cold starts essentially never happen.
 *
 * A heap guard skips the tick entirely when memory is already high, so the
 * background loop can never push the cgroup into swap thrash. (The previous
 * all-pages loop + an rss-parser socket leak froze the whole VM once idle;
 * both are fixed — this guard is the belt-and-braces.)
 */
const KEEP_WARM_INTERVAL_MS = 20 * 60 * 1000;
const INITIAL_DELAY_MS = 30_000;
/** Skip a refresh tick if the heap is already this high — protect the 380M cgroup. */
const HEAP_SKIP_BYTES = 300 * 1024 * 1024;

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

  let cursor = 0;
  let running = false;

  const tick = async (): Promise<void> => {
    if (running) return; // never overlap refresh cycles
    const heap = process.memoryUsage().heapUsed;
    if (heap > HEAP_SKIP_BYTES) {
      console.warn(
        `[keep-warm] Skipping refresh — heap at ${(heap / 1024 / 1024).toFixed(0)}MB`
      );
      return;
    }
    running = true;
    try {
      // Re-read pages each tick so settings changes apply without a restart.
      const contentPages = getEnabledPages().filter((p) => !SPECIAL_PAGE_IDS.has(p.id));
      if (contentPages.length === 0) return;
      const page = contentPages[cursor % contentPages.length];
      cursor += 1;
      await refreshPageInBackground(page.id);
    } catch (error) {
      console.error("[keep-warm] Refresh failed:", error);
    } finally {
      running = false;
    }
  };

  g.__newsKeepWarm = setInterval(() => {
    void tick();
  }, KEEP_WARM_INTERVAL_MS);

  // First warm-up shortly after boot so a restarted VM recovers quickly.
  setTimeout(() => {
    void tick();
  }, INITIAL_DELAY_MS);
}

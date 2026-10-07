/**
 * Server instrumentation — runs once when the Next.js server starts.
 *
 * Keep-warm loop: refresh every enabled page every 20 minutes (inside the
 * 30-min staleness window) so the SQLite cache is ALWAYS warm before a
 * human shows up. This lives in the app itself — zero GitHub Actions usage,
 * zero external schedulers. On the 512MB VM each refresh is sequenced
 * (2 sources at a time, 8s fetch timeouts) and deduped per page.
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
  const { refreshPageInBackground } = await import("@/lib/articles");

  const refreshAll = async (): Promise<void> => {
    // Sequence pages one at a time; each page already limits source
    // concurrency internally. Failures are logged inside refreshPageInBackground.
    for (const page of getEnabledPages()) {
      await refreshPageInBackground(page.id);
    }
  };

  const timer = setInterval(() => {
    void refreshAll().catch((error) => {
      console.error("[keep-warm] Refresh cycle failed:", error);
    });
  }, KEEP_WARM_INTERVAL_MS);

  // Don't let the interval keep `register()` pending — the docs require
  // register to complete before the server accepts requests.
  g.__newsKeepWarm = timer;

  // First warm-up shortly after boot so a restarted VM is ready quickly.
  setTimeout(() => {
    void refreshAll().catch((error) => {
      console.error("[keep-warm] Initial refresh failed:", error);
    });
  }, INITIAL_DELAY_MS);
}

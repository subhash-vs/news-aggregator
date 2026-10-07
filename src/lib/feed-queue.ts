/**
 * The ONLY place in the app that performs outbound HTTP fetches.
 *
 * Architectural rule: request handlers never touch the network — they read
 * SQLite. Every fetch (page refreshes, publisher top-feeds) is enqueued
 * here. Three properties keep the 512MB VM safe no matter what callers do:
 *
 *  1. Global concurrency cap — at most MAX_CONCURRENT_FETCHES outbound
 *     requests exist at any moment, across all callers.
 *  2. Dedup by key — the same job (e.g. `page:world`) never runs twice
 *     concurrently; repeat enqueues await the in-flight run.
 *  3. Circuit breaker — a feed failing FAILURE_THRESHOLD times in a row
 *     cools off for COOLDOWN_MS, so dead feeds (403s, broken XML) stop
 *     consuming sockets and CPU on every cycle.
 */

const MAX_CONCURRENT_FETCHES = 3;

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 60 * 1000;

type QueueJob = () => Promise<void>;

const pending: Array<{ key: string; run: QueueJob }> = [];
const activeJobs = new Map<string, Promise<void>>();
let activeCount = 0;

function pump(): void {
  while (activeCount < MAX_CONCURRENT_FETCHES && pending.length > 0) {
    const next = pending.shift();
    if (!next) break;
    activeCount += 1;
    next
      .run()
      .catch((error) => {
        console.error(`[fetch-queue] Job ${next.key} failed:`, error);
      })
      .finally(() => {
        activeCount -= 1;
        pump();
      });
  }
}

/** Enqueue a fetch job. Concurrent enqueues with the same key share one run. */
export function enqueueFetch(key: string, job: QueueJob): Promise<void> {
  const existing = activeJobs.get(key);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    pending.push({ key, run: () => job().then(resolve, reject) });
    pump();
  });
  activeJobs.set(key, promise);
  // Mark handled so fire-and-forget callers don't trip unhandledRejection;
  // awaiters still observe the rejection through the returned promise.
  promise.catch(() => {});
  promise.finally(() => {
    activeJobs.delete(key);
  });
  return promise;
}

/* ----------------------------- circuit breaker ---------------------------- */

interface FailureState {
  failures: number;
  openUntil: number;
}

const failureState = new Map<string, FailureState>();

export function isFeedCooledOff(key: string): boolean {
  const state = failureState.get(key);
  return !!state && state.failures >= FAILURE_THRESHOLD && Date.now() < state.openUntil;
}

export function recordFeedFailure(key: string): void {
  const state = failureState.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + COOLDOWN_MS;
  }
  failureState.set(key, state);
}

export function recordFeedSuccess(key: string): void {
  failureState.delete(key);
}

/** Test/diagnostic helper — current breaker state for a feed key. */
export function feedBreakerState(key: string): FailureState | null {
  return failureState.get(key) ?? null;
}

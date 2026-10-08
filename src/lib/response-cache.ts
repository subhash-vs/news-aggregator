/**
 * Tiny in-process response cache for expensive serve-time pipelines
 * (articles dedupe/rank, cross-page Top ranking, Latest stream).
 *
 * The request handlers never touch the network, but they DO re-run the full
 * dedupe → categorize → rank pipeline over every cached article on each
 * request — including the ~10s stale-polls that often come back as 304s.
 * Keying the built response on its true inputs (newest fetchedAt, config
 * signature, coarse time bucket) makes repeat requests a Map lookup.
 *
 * Invalidation is defense-in-depth:
 *  - the key changes whenever article data, relevant config, or the time
 *    bucket changes;
 *  - onConfigRawChanged drops every entry outright, so config edits (category
 *    keywords, enabled sets) can never serve a response built from stale
 *    config even if a key component was missed.
 *
 * Eviction is FIFO by insertion with a hard size cap — the cache is bounded
 * to a few MB on the 512MB VM no matter how many pages/buckets churn.
 */
export class ResponseCache<V> {
  private map = new Map<string, V>();

  constructor(private readonly maxEntries = 32) {}

  get(key: string): V | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: V): void {
    if (this.map.size >= this.maxEntries && !this.map.has(key)) {
      // Map preserves insertion order — the first key is the oldest entry.
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/** Coarse bucket for time-dependent parts of cache keys (age filters). */
export function timeBucket(intervalMs: number, now = Date.now()): number {
  return Math.floor(now / intervalMs);
}

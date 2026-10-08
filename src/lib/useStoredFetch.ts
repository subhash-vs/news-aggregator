"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetch a JSON endpoint with conditional-GET support.
 *
 * Unlike NewsPage (which keeps previous data in React state during its
 * stale-poll loop), the Top and Latest pages unmount on navigation — so a
 * 304 on remount would leave nothing to render. The last payload + ETag are
 * mirrored in sessionStorage: remount restores instantly from storage, then
 * revalidates with If-None-Match; a 304 keeps the restored payload, a 200
 * replaces both. Result: tab switches render instantly and cost ~200 bytes
 * when nothing changed.
 */
export function useStoredFetch<T>(url: string, storageKey: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** ETag of the last payload we received — sent back as If-None-Match. */
  const etagRef = useRef<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      try {
        const res = await fetch(url, {
          headers:
            !force && etagRef.current ? { "If-None-Match": etagRef.current } : undefined,
        });
        if (res.status === 304) {
          // Payload unchanged — restored data (if any) is still accurate.
          setError(null);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newEtag = res.headers.get("etag");
        if (newEtag) etagRef.current = newEtag;
        const json = (await res.json()) as T;
        setData(json);
        setError(null);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ etag: newEtag, data: json }));
        } catch {
          /* storage full — non-fatal, next visit just refetches */
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [url, storageKey]
  );

  // Restore the previous payload on mount so a 304 (or slow network) still
  // has something to render. eslint-disable: external-system sync on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { etag?: string | null; data?: T };
      if (parsed?.data) {
        etagRef.current = parsed.etag ?? null;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData(parsed.data);
        setLoading(false);
      }
    } catch {
      /* corrupt entry — ignore, fetch will overwrite */
    }
  }, [storageKey]);

  useEffect(() => {
    // Fetch on mount: setState lands in load()'s async continuation after the
    // network response, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, [load]);

  /** Force a full refetch (skips If-None-Match), e.g. after a manual refresh. */
  const reload = useCallback(() => load(true), [load]);

  return { data, loading, error, reload };
}

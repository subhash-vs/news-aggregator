"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** Client-side bookmark id set, kept in sync with `/api/bookmarks`. */
export function useBookmarkIds() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { bookmarks: Array<{ id: string }> };
      setIds(new Set(data.bookmarks.map((b) => b.id)));
      setLoaded(true);
    } catch {
      // Leave existing set as-is; listing still works without icon state.
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Data fetch: setState only after network response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const bookmarkedIds = useMemo(() => ids, [ids]);

  const setBookmarked = useCallback((id: string, bookmarked: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (bookmarked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { bookmarkedIds, setBookmarked, refresh: load, loaded };
}

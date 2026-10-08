"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { Article } from "@/types";
import { ArticleGrid } from "@/components/ArticleGrid";
import { LoadingGrid } from "@/components/LoadingGrid";
import { PageHeader } from "@/components/PageHeader";
import {
  SourceFilterChips,
  filterByPublishers,
} from "@/components/SourceFilterChips";
import { useToast } from "@/components/Toast";
import { LATEST_WINDOW_HOURS } from "@/lib/constants";
import { useStoredFetch } from "@/lib/useStoredFetch";
import { useBookmarkIds } from "@/lib/useBookmarkIds";

interface LatestResponse {
  articles: Article[];
  windowHours: number;
  pages: Array<{ id: string; label: string }>;
  generatedAt: string;
}

function groupByPage(articles: Article[], pageLabels: Map<string, string>) {
  const map = new Map<string, Article[]>();
  for (const a of articles) {
    const key = a.page || "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return [...map.entries()].map(([id, arts]) => ({
    id,
    label: pageLabels.get(id) ?? id,
    articles: arts,
  }));
}

export default function LatestPage() {
  const { data, loading, error, reload } = useStoredFetch<LatestResponse>(
    "/api/latest",
    "newsflow-feed:latest"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { bookmarkedIds, setBookmarked } = useBookmarkIds();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("newsflow-srcfilter:latest");
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSourceFilter(new Set(arr.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function updateLatestFilter(next: Set<string>) {
    setSourceFilter(next);
    try {
      localStorage.setItem("newsflow-srcfilter:latest", JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/articles/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
      toast("Refreshed all pages");
    } catch {
      toast("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [reload, toast]);

  const articles = useMemo(
    () => filterByPublishers(data?.articles ?? [], sourceFilter),
    [data, sourceFilter]
  );
  const grouped = useMemo(() => {
    const pageLabels = new Map(
      (data?.pages ?? []).map((p) => [p.id, p.label] as const)
    );
    return groupByPage(articles, pageLabels);
  }, [articles, data?.pages]);
  const windowHours = data?.windowHours ?? LATEST_WINDOW_HOURS;

  return (
    <div>
      <PageHeader
        title="Latest"
        subtitle={`Hard news only · last ${windowHours} hours · no sports or cinema`}
        refreshing={refreshing || (loading && !data)}
        onRefresh={refresh}
        stale={false}
      />

      {loading && !data ? <LoadingGrid count={6} /> : null}

      {error && !data ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-accent" aria-hidden />
          <h2 className="font-display text-xl font-bold">Failed to load latest stories</h2>
          <p className="max-w-md font-serif text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              void reload();
            }}
            className="section-label bg-primary px-4 py-2 text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : null}

      {data && data.articles.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-16 text-center">
          <Clock className="h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-xl font-bold">Nothing in the last {windowHours} hours</h2>
          <p className="max-w-md font-serif text-sm text-muted-foreground">
            Cached stories may be older than the window. Hit refresh to pull new items from sources.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="section-label border border-border px-4 py-2 text-foreground hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        </div>
      ) : null}

      {data && data.articles.length > 0 ? (
        <>
          <p className="meta-line mb-4">
            {articles.length} {articles.length === 1 ? "story" : "stories"} · last {windowHours}h
          </p>
          <SourceFilterChips
            articles={data.articles}
            selected={sourceFilter}
            onChange={updateLatestFilter}
          />
          {grouped.length > 0 ? (
            <div className="space-y-8">
              {grouped.map((group) => (
                <div key={group.id}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-foreground">{group.label}</h3>
                    <span className="meta-line">{group.articles.length}</span>
                  </div>
                  <ArticleGrid
                    articles={group.articles}
                    bookmarkedIds={bookmarkedIds}
                    onBookmarkChange={setBookmarked}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="font-serif text-sm text-muted-foreground">
              No stories from the selected sources in this window.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

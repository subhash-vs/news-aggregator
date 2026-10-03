"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { Article } from "@/types";
import { ArticleGrid } from "@/components/ArticleGrid";
import { LoadingGrid } from "@/components/LoadingGrid";
import { PageHeader } from "@/components/PageHeader";
import {
  SourceFilterChips,
  filterByPublishers,
} from "@/components/SourceFilterChips";
import { useToast } from "@/components/Toast";
import { useBookmarkIds } from "@/lib/useBookmarkIds";

interface SourceTopResult {
  feed: {
    id: string;
    label: string;
    publisher: string;
    kind: string;
    fidelity?: "front-page" | "section" | "community";
  };
  articles: Article[];
  error?: string;
}

const FIDELITY_LABEL: Record<string, string> = {
  "front-page": "Front page",
  section: "Section feed",
  community: "Community top",
};

interface TopResponse {
  articles: Article[];
  sourceTops: SourceTopResult[];
  pages: Array<{ id: string; label: string }>;
  generatedAt: string;
  maxAgeHours: number;
  ranking: string;
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

export default function TopStoriesPage() {
  const [data, setData] = useState<TopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { bookmarkedIds, setBookmarked } = useBookmarkIds();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("newsflow-srcfilter:top");
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) {
          // Sync filter from localStorage (external system).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSourceFilter(new Set(arr.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function updateTopFilter(next: Set<string>) {
    setSourceFilter(next);
    try {
      localStorage.setItem("newsflow-srcfilter:top", JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/top?perPage=6");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TopResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load top stories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch after network response only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch("/api/articles/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      toast("Refreshed all pages");
    } catch {
      toast("Refresh failed");
      setLoading(false);
    }
  }, [load, toast]);

  const rankedArticles = useMemo(
    () => filterByPublishers(data?.articles ?? [], sourceFilter),
    [data, sourceFilter]
  );
  const grouped = useMemo(() => {
    const pageLabels = new Map(
      (data?.pages ?? []).map((p) => [p.id, p.label] as const)
    );
    return groupByPage(rankedArticles, pageLabels);
  }, [rankedArticles, data?.pages]);
  const sourceTops = useMemo(() => data?.sourceTops ?? [], [data]);

  return (
    <div>
      <PageHeader
        title="Top Stories"
        subtitle="Publisher front pages + ranked picks across every section"
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
          <h2 className="font-display text-xl font-bold">Failed to load top stories</h2>
          <p className="max-w-md font-serif text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="section-label bg-primary px-4 py-2 text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : null}

      {data && data.articles.length === 0 && sourceTops.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-16 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-xl font-bold">No top stories yet</h2>
          <p className="max-w-md font-serif text-sm text-muted-foreground">
            Open a section page first, then refresh.
          </p>
        </div>
      ) : null}

      {/* Publisher-native top stories */}
      {sourceTops.length > 0 ? (
        <section className="mb-10">
          <div className="mb-4">
            <div className="rule-thick mb-2" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="section-label text-foreground">Top stories from sources</h2>
            </div>
          </div>

          <div className="space-y-8">
            {sourceTops.map((item) => (
              <div key={item.feed.id}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {item.feed.label}
                  </h3>
                  <span className="meta-line">
                    {item.feed.publisher}
                    {item.feed.fidelity ? ` · ${FIDELITY_LABEL[item.feed.fidelity] ?? item.feed.fidelity}` : ""}
                    {item.articles.length === 0 && item.error
                      ? " · Temporarily unavailable"
                      : item.error
                        ? ` · ${item.error}`
                        : ""}
                  </span>
                </div>
                {item.articles.length > 0 ? (
                  <ArticleGrid
                    articles={item.articles}
                    bookmarkedIds={bookmarkedIds}
                    onBookmarkChange={setBookmarked}
                  />
                ) : (
                  <p className="font-serif text-sm text-muted-foreground">
                    {item.error
                      ? "Feed didn’t respond this time — try refresh in a minute."
                      : "No articles from this feed right now."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Heat-ranked cross-section picks */}
      {(data?.articles.length ?? 0) > 0 ? (
        <section>
          <div className="mb-4">
            <div className="rule-thick mb-2" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="section-label text-foreground">Ranked across sections</h2>
              <span className="meta-line">
                Our heat score from cached stories · not the publisher’s own top list
              </span>
            </div>
          </div>

          <SourceFilterChips
            articles={data?.articles ?? []}
            selected={sourceFilter}
            onChange={updateTopFilter}
          />

          {grouped.length > 0 ? (
            <div className="space-y-8">
              {grouped.map((group) => (
                <div key={group.id}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-foreground">{group.label}</h3>
                    <span className="meta-line">Top picks</span>
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
              No stories from the selected sources in this ranking.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

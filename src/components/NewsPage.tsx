"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Newspaper } from "lucide-react";
import type { Article, ArticlesResponse } from "@/types";
import { ArticleGrid } from "@/components/ArticleGrid";
import { LeadStory, LeadStorySkeleton } from "@/components/LeadStory";
import { LoadingGrid } from "@/components/LoadingGrid";
import { PageHeader } from "@/components/PageHeader";
import {
  SourceFilterChips,
  filterByPublishers,
} from "@/components/SourceFilterChips";
import { useToast } from "@/components/Toast";
import { pickLeadStory } from "@/lib/rank";
import { useBookmarkIds } from "@/lib/useBookmarkIds";

function storageKey(pageId: string): string {
  return `newsflow-srcfilter:${pageId}`;
}

function readSelected(pageId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(pageId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSelected(pageId: string, next: Set<string>): void {
  try {
    localStorage.setItem(storageKey(pageId), JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
}

export function NewsPage({
  pageId,
  title,
  subtitle,
}: {
  pageId: string;
  title: string;
  subtitle?: string;
}) {
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(() => new Set());
  const { toast } = useToast();
  const { bookmarkedIds, setBookmarked } = useBookmarkIds();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Sync filter from sessionStorage (external system) when page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceFilter(readSelected(pageId));
  }, [pageId]);

  const load = useCallback(
    async (force = false) => {
      try {
        const res = await fetch(`/api/articles?page=${pageId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ArticlesResponse;
        setData(json);
        setError(null);

        if (force) {
          const failed = json.sourceStatus.filter((s) => !s.ok).length;
          if (json.articles.length > 0) {
            toast(failed > 0 ? `Refreshed with ${failed} source issue(s)` : "Refresh complete");
          } else {
            toast("Refresh finished — no articles");
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load articles";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageId, toast]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/articles/refresh?page=${pageId}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ArticlesResponse;
      setData(json);
      setError(null);
      const failed = json.sourceStatus.filter((s) => !s.ok).length;
      toast(failed > 0 ? `Refreshed with ${failed} source issue(s)` : "Refresh complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
      toast("Refresh failed");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [pageId, toast]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void load(false);
  }, [load]);

  // Stale-while-revalidate client: when the server serves cached-but-stale
  // articles, a background refresh is already running. Poll every ~8s (capped)
  // until fresh data arrives instead of showing outdated news indefinitely.
  const stalePollsRef = useRef(0);
  useEffect(() => {
    if (!data?.stale) {
      stalePollsRef.current = 0;
      return;
    }
    if (stalePollsRef.current >= 8) return; // ~1 minute max of polling
    stalePollsRef.current += 1;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        void load(false);
      }
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [data, load]);

  useEffect(() => {
    const minutes = data?.refreshIntervalMinutes ?? 0;
    if (!minutes || minutes <= 0) return;

    const interval = window.setInterval(
      () => {
        if (document.visibilityState === "visible") {
          void refresh();
        }
      },
      minutes * 60 * 1000
    );

    return () => window.clearInterval(interval);
  }, [data?.refreshIntervalMinutes, refresh]);

  const articles = useMemo(() => data?.articles ?? [], [data]);
  const categories = useMemo(() => data?.categories ?? [], [data]);
  const failedSources = useMemo(
    () => (data?.sourceStatus ?? []).filter((s) => !s.ok),
    [data]
  );
  const sourceWarning = useMemo(() => {
    if (!failedSources.length) return null;
    return `Some sources unavailable (${failedSources.map((s) => s.name).join(", ")}). Showing what we have.`;
  }, [failedSources]);

  const filteredArticles = useMemo(
    () => filterByPublishers(articles, sourceFilter),
    [articles, sourceFilter]
  );

  const { lead, rest } = useMemo(() => {
    if (filteredArticles.length === 0) {
      return { lead: null as Article | null, rest: [] as Article[] };
    }
    const leadArticle = pickLeadStory(filteredArticles);
    const leadId = leadArticle?.id;
    const restArticles = filteredArticles.filter((a) => a.id !== leadId);
    return { lead: leadArticle, rest: restArticles };
  }, [filteredArticles]);

  const grouped = useMemo(() => {
    type Group = { id: string; label: string | null; articles: Article[] };
    if (categories.length === 0) {
      return [{ id: "all", label: null, articles: rest }] as Group[];
    }
    const used = new Set<string>();
    const groups: Group[] = categories.map((category) => {
      const items = rest.filter((a) => a.category === category.id);
      items.forEach((a) => used.add(a.id));
      return { id: category.id, label: category.label, articles: items };
    });
    const leftover = rest.filter((a) => !used.has(a.id) || !a.category);
    if (leftover.length) {
      groups.push({ id: "other", label: "Other", articles: leftover });
    }
    return groups.filter((g) => g.articles.length > 0 || g.label === null);
  }, [rest, categories]);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        refreshing={refreshing || (loading && !data)}
        onRefresh={refresh}
        stale={data?.stale}
        sourceWarning={sourceWarning}
      />

      {loading && !data ? (
        <div>
          <LeadStorySkeleton />
          <LoadingGrid count={6} />
        </div>
      ) : null}

      {error && !data ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-accent" aria-hidden />
          <h2 className="font-display text-xl font-bold">Failed to load articles</h2>
          <p className="max-w-md font-serif text-sm leading-[1.65] text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load(true);
            }}
            className="section-label bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : null}

      {data && articles.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-16 text-center">
          <Newspaper className="h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-xl font-bold">No articles found</h2>
          <p className="max-w-md font-serif text-sm leading-[1.65] text-muted-foreground">
            Nothing matched this page right now. Try refreshing, or enable more sources in Settings.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="section-label border border-border px-4 py-2 text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        </div>
      ) : null}

      {data && articles.length > 0 && filteredArticles.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-12 text-center">
          <h2 className="font-display text-xl font-bold">No stories from selected sources</h2>
          <p className="max-w-md font-serif text-sm text-muted-foreground">
            Try different source chips, or clear the filter to see everything.
          </p>
          <button
            type="button"
            onClick={() => {
              const next = new Set<string>();
              setSourceFilter(next);
              writeSelected(pageId, next);
            }}
            className="section-label border border-border px-4 py-2 text-foreground hover:border-accent hover:text-accent"
          >
            Clear source filter
          </button>
        </div>
      ) : null}

      {data && articles.length > 0 ? (
        <SourceFilterChips
          articles={articles}
          selected={sourceFilter}
          onChange={(next) => {
            setSourceFilter(next);
            writeSelected(pageId, next);
          }}
        />
      ) : null}

      {data && lead ? (
        <LeadStory
          article={lead}
          bookmarked={bookmarkedIds.has(lead.id)}
          onBookmarkChange={setBookmarked}
          label={pageId === "world" ? "Front page" : "Lead story"}
        />
      ) : null}

      {data && rest.length > 0
        ? grouped.map((group) => (
            <section key={group.id} className="mb-8 last:mb-0">
              {group.label ? (
                <div className="mb-4">
                  <div className="rule-thick mb-2" />
                  <h2 className="section-label text-foreground">{group.label}</h2>
                </div>
              ) : null}
              <ArticleGrid
                articles={group.articles}
                bookmarkedIds={bookmarkedIds}
                onBookmarkChange={setBookmarked}
              />
            </section>
          ))
        : null}
    </div>
  );
}

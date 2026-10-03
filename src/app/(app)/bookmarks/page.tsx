"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Article } from "@/types";
import { ArticleCard } from "@/components/ArticleCard";
import { LoadingGrid } from "@/components/LoadingGrid";
import { useToast } from "@/components/Toast";

export default function BookmarksPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { bookmarks: Article[] };
      setArticles(data.bookmarks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    }
  }, []);

  useEffect(() => {
    // Data fetch: setState only after network response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const bookmarkedIds = useMemo(
    () => new Set((articles ?? []).map((a) => a.id)),
    [articles]
  );

  async function remove(article: Article) {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article }),
    });
    if (!res.ok) {
      toast("Could not remove bookmark");
      return;
    }
    toast("Removed bookmark");
    await load();
  }

  return (
    <div>
      <header className="mb-6">
        <div className="rule-thick mb-3" />
        <h1 className="font-masthead text-[clamp(1.75rem,4.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.01em]">
          Bookmarks
        </h1>
        <p className="mt-1 font-serif text-sm leading-[1.5] text-muted-foreground">
          Articles you saved for later.
        </p>
      </header>

      {articles === null && !error ? <LoadingGrid count={3} /> : null}

      {error ? (
        <p role="alert" className="border-l-4 border-destructive bg-muted px-4 py-3 font-serif text-sm text-destructive">
          Failed to load bookmarks: {error}
        </p>
      ) : null}

      {articles && articles.length === 0 ? (
        <div className="border border-border bg-card px-6 py-16 text-center">
          <h2 className="font-display text-xl font-bold">No bookmarks yet</h2>
          <p className="mt-2 font-serif text-sm leading-[1.65] text-muted-foreground">
            Save articles from any page with the bookmark icon. They will show up here.
          </p>
        </div>
      ) : null}

      {articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <div key={article.id} className="relative">
              <ArticleCard article={article} bookmarked />
              <button
                type="button"
                onClick={() => void remove(article)}
                className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`Remove bookmark: ${article.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {articles && articles.length > 0 ? (
        <p className="sr-only">{bookmarkedIds.size} bookmarked articles</p>
      ) : null}
    </div>
  );
}

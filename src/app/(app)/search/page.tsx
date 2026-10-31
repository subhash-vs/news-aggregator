"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Newspaper } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchResponse } from "@/types";
import { ArticleGrid } from "@/components/ArticleGrid";
import { LoadingGrid } from "@/components/LoadingGrid";
import { PageHeader } from "@/components/PageHeader";
import { SearchBox } from "@/components/SearchBox";
import { useBookmarkIds } from "@/lib/useBookmarkIds";
import { tokenize } from "@/lib/search";

/**
 * Global search (Stage 2 of docs/SEARCH-DESIGN.md): keyword matches against
 * every cached headline across all pages, ranked phrase > word > substring,
 * newest first. Query lives in ?q= so results are shareable and survive
 * back/forward.
 */
function SearchView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { bookmarkedIds, setBookmarked } = useBookmarkIds();

  // Sync input when the URL changes externally (back/forward, shared link).
  // Adjusted during render — the React-recommended alternative to a
  // setState-in-effect sync.
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const trimmed = query.trim();
  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    // Reflect the query in the URL (?q=) without scrolling or adding history
    // noise for every keystroke. Same-href replaces are skipped explicitly —
    // Next would otherwise re-fetch the RSC payload for an identical URL.
    const next = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
    const current = urlQuery ? `/search?q=${encodeURIComponent(urlQuery)}` : "/search";
    if (next !== current) router.replace(next, { scroll: false });
  }, [trimmed, urlQuery, router]);

  useEffect(() => {
    // Empty query: no fetch — the prompt branch renders instead and every
    // result branch below is guarded by `trimmed`, so stale data for a
    // cleared query can never surface. No `loading` state: "pending" is
    // derived as "no response matching this query yet", and setState only
    // ever happens after an await (react-hooks/set-state-in-effect).
    if (!trimmed) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SearchResponse;
        if (controller.signal.aborted) return; // a newer query owns the UI
        setData(json);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Search failed");
      }
    })();
    return () => controller.abort();
  }, [trimmed, attempt]);

  // Reflect the query in the URL (?q=) without scrolling or adding history
  // noise for every keystroke.
  useEffect(() => {
    const next = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
    const current = urlQuery ? `/search?q=${encodeURIComponent(urlQuery)}` : "/search";
    if (next !== current) router.replace(next, { scroll: false });
  }, [trimmed, urlQuery, router]);

  // Only a response echoing the current query counts as current — a
  // still-rendering previous result must never masquerade as the new one
  // (its highlights would use the wrong tokens). Pending = query sent but
  // no current response yet.
  const valid = data && data.query === trimmed ? data : null;
  const pending = !!trimmed && !error && !valid;
  const settled = valid ? valid.total : undefined;

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle="Match headlines by keyword across every page — World, Technology, Sports and the rest."
      />

      <SearchBox value={query} onChange={setQuery} matchCount={settled} />

      {!trimmed ? (
        <div className="border border-border bg-card px-6 py-14 text-center">
          <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-xl font-bold">Search every headline</h2>
          <p className="mx-auto mt-2 max-w-md font-serif text-sm leading-[1.65] text-muted-foreground">
            Type a keyword above — matches rank phrase hits first, then whole-word
            matches, newest first.
          </p>
        </div>
      ) : null}

      {trimmed && error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-accent" aria-hidden />
          <h2 className="font-display text-xl font-bold">Search failed</h2>
          <p className="max-w-md font-serif text-sm leading-[1.65] text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null); // event handler — effect refetches via attempt
              setAttempt((a) => a + 1);
            }}
            className="section-label border border-border px-4 py-2 text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {pending ? <LoadingGrid count={6} /> : null}

      {/* Zero matches: the count line under the input already reads
          "No titles match “q”" — a second box repeating it was noise. */}

      {!error && valid && valid.articles.length > 0 ? (
        <>
          <ArticleGrid
            articles={valid.articles}
            bookmarkedIds={bookmarkedIds}
            onBookmarkChange={setBookmarked}
            highlight={tokens}
          />
          {valid.total > valid.articles.length ? (
            <p className="meta-line mt-4">
              Showing {valid.articles.length} of {valid.total} matches
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  // useSearchParams must sit under Suspense for prerendering.
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}

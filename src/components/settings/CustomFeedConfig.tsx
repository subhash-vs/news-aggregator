"use client";

import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import type { AppConfig } from "@/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function googleNewsSearchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

export function CustomFeedConfig({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const pages = [...config.pages].sort((a, b) => a.order - b.order);
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId) ?? pages[0];

  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  function updateSources(nextSources: typeof page.sources) {
    if (!page) return;
    onChange({
      ...config,
      pages: config.pages.map((p) => (p.id === page.id ? { ...p, sources: nextSources } : p)),
    });
  }

  function addSource(source: {
    id: string;
    name: string;
    feedUrl: string;
  }) {
    if (!page) return;
    if (page.sources.some((s) => s.id === source.id)) return;
    updateSources([
      ...page.sources,
      {
        id: source.id,
        type: "rss",
        name: source.name,
        enabled: true,
        custom: true,
        config: { feedUrl: source.feedUrl },
      },
    ]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!page || !name.trim() || !feedUrl.trim()) return;

    let parsed: URL;
    try {
      parsed = new URL(feedUrl.trim());
    } catch {
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;

    addSource({
      id: `custom-${slugify(name)}`,
      name: name.trim(),
      feedUrl: parsed.toString(),
    });
    setName("");
    setFeedUrl("");
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!page || !q) return;
    addSource({
      id: `gnews-${slugify(q)}`,
      name: `Google News · ${q}`,
      feedUrl: googleNewsSearchUrl(q),
    });
    setSearchQuery("");
  }

  function remove(targetPageId: string, sourceId: string) {
    onChange({
      ...config,
      pages: config.pages.map((p) =>
        p.id === targetPageId ? { ...p, sources: p.sources.filter((s) => s.id !== sourceId) } : p
      ),
    });
  }

  if (!page) return <p className="text-sm text-muted-foreground">No pages configured.</p>;

  // Show EVERY saved custom feed/search across all pages, grouped by page —
  // the dropdown only picks where NEW additions go. (Previously this list
  // only showed the selected page's feeds, and defaulted to the first page,
  // so saved keywords on other pages appeared to be missing.)
  const feedGroups = pages
    .map((p) => ({ page: p, feeds: p.sources.filter((s) => s.custom) }))
    .filter((g) => g.feeds.length > 0);

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Custom feeds &amp; search</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Add any RSS feed, or search Google News — results are linked out to the original articles.
      </p>

      <label className="section-label mb-3 block text-foreground">
        Page
        <select
          value={page.id}
          onChange={(e) => setPageId(e.target.value)}
          className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground font-serif text-foreground sm:max-w-xs"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <form
        onSubmit={submitSearch}
        className="mb-6 space-y-3 border border-border bg-background p-4"
      >
        <h3 className="flex items-center gap-2 font-medium text-foreground">
          <Search className="h-4 w-4 text-accent" aria-hidden />
          Google News search
        </h3>
        <p className="text-xs text-muted-foreground">
          Adds a live RSS search feed for this page. Articles open on Google News → original source.
        </p>
        <label className="block text-sm">
          Search query
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
            placeholder="e.g. india politics, cricket test match, AI regulation"
            className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-1 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Google News search
        </button>
      </form>

      <form onSubmit={submit} className="mb-6 space-y-3 border border-border bg-background p-4">
        <h3 className="font-display font-bold text-foreground">Add RSS feed</h3>
        <label className="block text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Wired"
            className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground"
          />
        </label>
        <label className="block text-sm">
          Feed URL
          <input
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            required
            type="url"
            placeholder="https://example.com/feed.xml"
            className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-1 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add feed
        </button>
      </form>

      <ul className="space-y-4">
        {feedGroups.map((group) => (
          <li key={group.page.id}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.page.label}
            </p>
            <ul className="space-y-2">
              {group.feeds.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between gap-3 border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="font-display font-bold text-foreground">{source.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{source.config.feedUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(group.page.id, source.id)}
                    aria-label={`Delete feed ${source.name}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {feedGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom feeds or searches saved yet.
        </p>
      ) : null}
    </section>
  );
}

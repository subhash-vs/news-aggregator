"use client";

import { useMemo } from "react";
import type { Article } from "@/types";

export function publisherOf(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("nyt") || s.includes("new york times")) return "NYT";
  if (s.includes("bbc")) return "BBC";
  if (s.includes("guardian")) return "Guardian";
  if (s.includes("cnn")) return "CNN";
  if (s.includes("dw ") || s.includes("dw news") || s.startsWith("dw")) return "DW";
  if (s.includes("economist")) return "Economist";
  if (s.includes("hacker") || s === "hackernews" || s.includes("news.ycombinator")) {
    return "Hacker News";
  }
  if (s.includes("techcrunch")) return "TechCrunch";
  if (s.includes("verge")) return "The Verge";
  if (s.includes("ars")) return "Ars Technica";
  if (s.includes("google news")) return "Google News";
  if (s.includes("reddit")) return "Reddit";

  if (s.includes("reuters")) return "Reuters";
  if (s.includes("wsj") || s.includes("dow jones") || s.includes("dj markets")) {
    return "WSJ/DJ";
  }
  return source.split("·")[0].trim();
}

export function SourceFilterChips({
  articles,
  selected,
  onChange,
}: {
  articles: Article[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const publishers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      const p = publisherOf(a.source);
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [articles]);

  if (publishers.length <= 1) return null;

  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  function clear() {
    onChange(new Set());
  }

  const active = selected.size > 0;

  return (
    <div className="mb-5" role="group" aria-label="Filter by source">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={clear}
          aria-pressed={!active}
          className={`section-label border px-2.5 py-1.5 transition-colors ${
            !active
              ? "border-accent bg-muted text-accent"
              : "border-border bg-card text-muted-foreground hover:border-accent hover:text-accent"
          }`}
        >
          All
        </button>

        {publishers.map(([name, count]) => {
          const on = selected.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              aria-pressed={on}
              className={`section-label border px-2.5 py-1.5 transition-colors ${
                on
                  ? "border-accent bg-muted text-accent"
                  : "border-border bg-card text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {name}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {active ? (
        <p className="meta-line mt-2">
          Filtering: {[...selected].join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function filterByPublishers(articles: Article[], selected: Set<string>): Article[] {
  if (!selected.size) return articles;
  return articles.filter((a) => selected.has(publisherOf(a.source)));
}

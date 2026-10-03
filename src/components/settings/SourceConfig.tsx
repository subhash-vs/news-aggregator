"use client";

import { useState } from "react";
import type { AppConfig } from "@/types";
import { SPECIAL_PAGE_IDS } from "@/lib/constants";

export function SourceConfig({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const pages = [...config.pages]
    .filter((p) => !SPECIAL_PAGE_IDS.has(p.id))
    .sort((a, b) => a.order - b.order);
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId) ?? pages[0];

  function toggleSource(sourceId: string) {
    if (!page) return;
    onChange({
      ...config,
      pages: config.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              sources: p.sources.map((s) =>
                s.id === sourceId ? { ...s, enabled: !s.enabled } : s
              ),
            }
          : p
      ),
    });
  }

  if (!page) {
    return <p className="text-sm text-muted-foreground">No pages configured.</p>;
  }

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Sources per page</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enable or disable which sources feed each page.
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

      <ul className="space-y-2">
        {page.sources.map((source) => (
          <li
            key={source.id}
            className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-foreground">
                {source.name}
                {source.custom ? (
                  <span className="ml-2 bg-muted px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase text-accent">
                    Custom
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {source.type}
                {source.config.feedUrl ? ` · ${source.config.feedUrl}` : ""}
                {source.config.subreddit ? ` · r/${source.config.subreddit}` : ""}
                {source.config.section ? ` · section: ${source.config.section}` : ""}
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={() => toggleSource(source.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Enabled
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

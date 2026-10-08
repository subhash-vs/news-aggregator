"use client";

import type { AppConfig, SortMode } from "@/types";

const OPTIONS = [
  { value: 6, label: "Last 6 hours" },
  { value: 12, label: "Last 12 hours" },
  { value: 24, label: "Last 24 hours" },
  { value: 48, label: "Last 48 hours" },
  { value: 72, label: "Last 3 days" },
  { value: 168, label: "Last 7 days" },
  { value: 0, label: "All articles" },
];

const LATEST_WINDOW_OPTIONS = [
  { value: 1, label: "Last 1 hour" },
  { value: 2, label: "Last 2 hours" },
  { value: 4, label: "Last 4 hours" },
  { value: 6, label: "Last 6 hours" },
  { value: 12, label: "Last 12 hours" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string; hint: string }> = [
  {
    value: "latest",
    label: "Latest first",
    hint: "Chronological — newest published stories on top.",
  },
  {
    value: "top",
    label: "Top stories",
    hint: "Ranks by HN/Reddit engagement, recency, and trusted-source weight.",
  },
];

export function TimeWindowSettings({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const value = config.settings?.maxAgeHours ?? 24;
  const sortMode: SortMode = config.settings?.sortMode ?? "latest";
  const latestWindowHours = config.settings?.latestWindowHours ?? 2;

  function update(partial: {
    maxAgeHours?: number;
    sortMode?: SortMode;
    latestWindowHours?: number;
  }) {
    onChange({
      ...config,
      settings: {
        // Spread first so fields added later (e.g. yahooFinanceSymbols)
        // survive unrelated setting changes.
        ...config.settings,
        maxAgeHours: partial.maxAgeHours ?? value,
        sortMode: partial.sortMode ?? sortMode,
        designTheme: config.settings?.designTheme ?? "broadsheet",
        latestWindowHours: partial.latestWindowHours ?? latestWindowHours,
      },
    });
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Time window</h2>
        <p className="mb-3 font-serif text-sm text-muted-foreground">
          Global filter for how recent articles must be.
        </p>
        <label className="section-label block max-w-sm text-foreground">
          Show articles from
          <select
            value={value}
            onChange={(e) => update({ maxAgeHours: Number(e.target.value) })}
            className="section-label mt-2 w-full border border-border bg-card px-3 py-2 text-foreground"
          >
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Latest stream window</h2>
        <p className="mb-3 font-serif text-sm text-muted-foreground">
          How far back the Latest tab looks for hard-news stories.
        </p>
        <label className="section-label block max-w-sm text-foreground">
          Latest stories from
          <select
            value={latestWindowHours}
            onChange={(e) => update({ latestWindowHours: Number(e.target.value) })}
            className="section-label mt-2 w-full border border-border bg-card px-3 py-2 text-foreground"
          >
            {LATEST_WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Ranking</h2>
        <p className="mb-3 font-serif text-sm text-muted-foreground">
          How stories are ordered on every page.
        </p>
        <div className="flex flex-col gap-2">
          {SORT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 border p-3 ${
                sortMode === opt.value
                  ? "border-accent bg-muted"
                  : "border-border bg-card hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="sortMode"
                checked={sortMode === opt.value}
                onChange={() => update({ sortMode: opt.value })}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                <span className="section-label block text-foreground">{opt.label}</span>
                <span className="mt-1 block font-serif text-xs text-muted-foreground">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

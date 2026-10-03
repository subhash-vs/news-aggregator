"use client";

import type { AppConfig } from "@/types";
import { SPECIAL_PAGE_IDS } from "@/lib/constants";

const INTERVALS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
];

export function AutoRefreshSettings({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const pages = [...config.pages]
    .filter((p) => !SPECIAL_PAGE_IDS.has(p.id))
    .sort((a, b) => a.order - b.order);

  function setIntervalFor(pageId: string, minutes: number) {
    onChange({
      ...config,
      pages: config.pages.map((p) =>
        p.id === pageId ? { ...p, refreshIntervalMinutes: minutes } : p
      ),
    });
  }

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Auto-refresh</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Articles update automatically when a page is visible. Pause uses the browser tab
        visibility.
      </p>
      <ul className="space-y-2">
        {pages.map((page) => (
          <li
            key={page.id}
            className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="font-display font-bold text-foreground">{page.label}</p>
            <label className="text-sm text-foreground">
              Interval
              <select
                value={page.refreshIntervalMinutes ?? 0}
                onChange={(e) => setIntervalFor(page.id, Number(e.target.value))}
                className="ml-2 border border-border bg-card px-2 py-1.5 text-foreground"
              >
                {INTERVALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

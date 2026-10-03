"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { AppConfig } from "@/types";
import { pageHref } from "@/components/Nav";
import { SPECIAL_PAGE_IDS } from "@/lib/constants";

export function PageReorder({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const pages = [...config.pages].sort((a, b) => a.order - b.order);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const reordered = next.map((page, i) => ({ ...page, order: i }));
    onChange({ ...config, pages: reordered });
  }

  function toggleEnabled(pageId: string) {
    onChange({
      ...config,
      pages: config.pages.map((p) =>
        p.id === pageId ? { ...p, enabled: !p.enabled } : p
      ),
    });
  }

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Page order</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Drag order with up/down controls. Includes Top and Latest. Disabled pages are hidden from navigation.
      </p>
      <ol className="space-y-2">
        {pages.map((page, index) => {
          const special = SPECIAL_PAGE_IDS.has(page.id);
          const enabledCount = page.sources.filter((s) => s.enabled).length;
          return (
            <li
              key={page.id}
              className="flex flex-col gap-3 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground">
                  {index + 1}. {page.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pageHref(page.id)}
                  {special
                    ? " · Special tab (no RSS sources)"
                    : ` · ${enabledCount}/${page.sources.length} sources enabled`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={page.enabled}
                    onChange={() => toggleEnabled(page.id)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Enabled
                </label>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${page.label} up`}
                    className="inline-flex h-8 w-8 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === pages.length - 1}
                    aria-label={`Move ${page.label} down`}
                    className="inline-flex h-8 w-8 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

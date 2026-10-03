"use client";

import { Loader2, RefreshCw } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  refreshing,
  onRefresh,
  stale,
  sourceWarning,
}: {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  stale?: boolean;
  sourceWarning?: string | null;
  maxAgeHours?: number;
}) {
  return (
    <header className="mb-5">
      <div className="rule-thick mb-3" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-masthead text-[clamp(1.65rem,4vw,2.25rem)] font-bold leading-[1.08] tracking-[-0.01em] text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 max-w-2xl font-serif text-sm leading-[1.45] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing articles" : "Refresh articles"}
            title="Refresh"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {stale ? (
        <p className="meta-line mt-1 text-accent">Cached · may be outdated</p>
      ) : null}

      {sourceWarning ? (
        <p
          role="status"
          className="mt-2 border-l-4 border-accent bg-muted px-3 py-1.5 font-serif text-sm text-foreground"
        >
          {sourceWarning}
        </p>
      ) : null}
    </header>
  );
}

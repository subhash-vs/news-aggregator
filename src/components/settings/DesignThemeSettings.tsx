"use client";

import type { AppConfig, DesignTheme } from "@/types";
import { applyDesignTheme } from "@/components/DesignTheme";

const OPTIONS: Array<{
  value: DesignTheme;
  label: string;
  hint: string;
}> = [
  {
    value: "broadsheet",
    label: "Broadsheet",
    hint: "Heritage newsprint — warm paper, crimson accents, Playfair masthead, double rules.",
  },
  {
    value: "nyt",
    label: "The New York Times",
    hint: "Clean digital broadsheet — white paper, Franklin labels, blue links, denser grid.",
  },
];

export function DesignThemeSettings({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const current = config.settings?.designTheme ?? "broadsheet";

  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold">Design</h2>
      <p className="mb-3 font-serif text-sm text-muted-foreground">
        Switch the visual system. Saved to config and applied immediately.
      </p>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({
                  ...config,
                  settings: {
                    // Spread first so fields added later (e.g.
                    // yahooFinanceSymbols) survive theme changes.
                    ...config.settings,
                    maxAgeHours: config.settings?.maxAgeHours ?? 24,
                    sortMode: config.settings?.sortMode ?? "latest",
                    designTheme: opt.value,
                    latestWindowHours: config.settings?.latestWindowHours,
                  },
                });
                applyDesignTheme(opt.value);
              }}
              className={`border p-4 text-left transition-colors ${
                active
                  ? "border-accent bg-muted"
                  : "border-border bg-card hover:border-accent"
              }`}
              aria-pressed={active}
            >
              <span className="section-label block text-foreground">{opt.label}</span>
              <span className="mt-1 block font-serif text-xs leading-[1.5] text-muted-foreground">
                {opt.hint}
              </span>
              {active ? (
                <span className="meta-line mt-2 block text-accent">Active</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

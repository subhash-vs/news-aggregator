"use client";

import { useEffect, useRef, useState } from "react";
import type { AppConfig } from "@/types";
import {
  DEFAULT_YAHOO_SYMBOLS,
  MAX_YAHOO_SYMBOLS,
  parseYahooSymbols,
  yahooFeedUrl,
} from "@/lib/yahoo-finance";

/**
 * Yahoo Finance watchlist editor. Symbols drive the per-symbol headline feed
 * shown as the "Yahoo Finance Watchlist" panel on Top and as a source on the
 * Finance page. Yahoo killed its general finance RSS; this is the replacement.
 */
export function YahooWatchlistSettings({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const symbols = config.settings?.yahooFinanceSymbols ?? DEFAULT_YAHOO_SYMBOLS;
  const joined = symbols.join(", ");

  // Local text buffer so typing "VOO, VTI," isn't fought by normalization
  // removing the trailing comma on every keystroke. The config always holds
  // the parsed list; the buffer syncs when symbols change from OUTSIDE this
  // component (cancel/reset on the settings page).
  const [text, setText] = useState(joined);
  const lastEmitted = useRef(joined);

  useEffect(() => {
    if (joined !== lastEmitted.current) {
      setText(joined);
      lastEmitted.current = joined;
    }
  }, [joined]);

  function handleInput(raw: string) {
    setText(raw);
    const parsed = parseYahooSymbols(raw);
    lastEmitted.current = parsed.join(", ");
    onChange({
      ...config,
      settings: {
        ...config.settings,
        maxAgeHours: config.settings?.maxAgeHours ?? 24,
        sortMode: config.settings?.sortMode ?? "latest",
        designTheme: config.settings?.designTheme ?? "broadsheet",
        latestWindowHours: config.settings?.latestWindowHours,
        yahooFinanceSymbols: parsed,
      },
    });
  }

  function handleBlur() {
    // Normalize the visible text to the canonical parsed form.
    const parsed = parseYahooSymbols(text);
    setText(parsed.join(", "));
    lastEmitted.current = parsed.join(", ");
  }

  const preview = yahooFeedUrl(symbols);

  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold">Yahoo Finance watchlist</h2>
      <p className="mb-3 font-serif text-sm text-muted-foreground">
        Ticker symbols for the Yahoo Finance feed on Top and Finance. Comma or
        space separated. Indices work too (e.g. <code>^GSPC</code>).
      </p>
      <label className="section-label block max-w-xl text-foreground">
        Symbols
        <input
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={handleBlur}
          placeholder="VOO, VTI, CRM, MU"
          spellCheck={false}
          className="section-label mt-2 w-full border border-border bg-card px-3 py-2 font-mono text-foreground"
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        {symbols.length}/{MAX_YAHOO_SYMBOLS} symbols
        {symbols.length === 0 ? " — at least one required" : ""} · resets to{" "}
        {DEFAULT_YAHOO_SYMBOLS.join(", ")} if cleared
      </p>
      {preview ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Feed: <span className="font-mono">{preview}</span>
        </p>
      ) : null}
    </section>
  );
}

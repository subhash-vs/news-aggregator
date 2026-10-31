"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Debounced title-search input. Holds the raw input locally and emits the
 * debounced value upward, so typing stays responsive while filtering runs
 * on the settled query. Esc clears (matching the publisher-chip UX).
 */
export function SearchBox({
  value,
  onChange,
  matchCount,
  totalCount,
}: {
  /** Debounced query owned by the parent (reset on page change). */
  value: string;
  onChange: (next: string) => void;
  /** Titles matching the current query; omitted when no query is active. */
  matchCount?: number;
  /** Total titles before filtering — shown alongside matchCount. */
  totalCount?: number;
}) {
  const [text, setText] = useState(value);
  const timerRef = useRef<number | null>(null);

  // Sync from the parent when the query changes externally (the "clear
  // search" button in the empty state). Adjusting during render — the
  // React-recommended alternative to a setState-in-effect sync.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function emit(next: string) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onChange(next), 150);
  }

  function handleChange(next: string) {
    setText(next);
    emit(next);
  }

  function clear() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setText("");
    onChange("");
  }

  const active = text.trim().length > 0;
  // Hide the count while the debounce is still pending — parent matchCount
  // reflects the previous query until emit() lands.
  const settled = text === value;

  return (
    <div role="search" aria-label="Search titles" className="mb-4">
      <div className="relative w-full max-w-xs sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && text) {
              event.stopPropagation();
              clear();
            }
          }}
          placeholder="Search titles…"
          aria-label="Search titles"
          className="w-full border-b border-border bg-transparent py-1.5 pl-6 pr-6 font-serif text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 hover:border-muted-foreground/50 focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {active ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-accent"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {active && settled && typeof matchCount === "number" ? (
        <p className="meta-line mt-1.5" role="status" aria-live="polite">
          {matchCount === 0
            ? `No titles match “${text.trim()}”`
            : `${matchCount} of ${totalCount ?? matchCount} title${matchCount === 1 ? "" : "s"} match “${text.trim()}”`}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { LayoutTemplate, Newspaper } from "lucide-react";
import type { DesignTheme } from "@/types";

const STORAGE_KEY = "newsflow-design";

function readDesign(): DesignTheme {
  if (typeof document === "undefined") return "broadsheet";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "nyt" ? "nyt" : "broadsheet";
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getServerSnapshot(): DesignTheme {
  return "broadsheet";
}

export function applyDesignTheme(next: DesignTheme): void {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  // Best-effort persist to config (settings Save still works)
  void fetch("/api/config/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ designTheme: next }),
  }).catch(() => undefined);
}

export function DesignThemeToggle() {
  const design = useSyncExternalStore(subscribe, readDesign, getServerSnapshot);

  const toggle = useCallback(() => {
    applyDesignTheme(design === "nyt" ? "broadsheet" : "nyt");
  }, [design]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        design === "nyt"
          ? "Switch to broadsheet design"
          : "Switch to New York Times design"
      }
      title={design === "nyt" ? "NYT design" : "Broadsheet design"}
      className="section-label inline-flex h-9 items-center gap-1.5 border border-border bg-card px-2.5 text-foreground transition-colors hover:text-accent"
    >
      {design === "nyt" ? (
        <Newspaper className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <LayoutTemplate className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">{design === "nyt" ? "NYT" : "Paper"}</span>
    </button>
  );
}

/** Applies design theme from server config on first client mount. */
export function DesignThemeBridge({ designTheme }: { designTheme: DesignTheme }) {
  useEffect(() => {
    let stored: DesignTheme | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "nyt" || raw === "broadsheet") stored = raw;
    } catch {
      /* ignore */
    }
    const next = stored ?? designTheme;
    document.documentElement.setAttribute("data-theme", next);
  }, [designTheme]);

  return null;
}

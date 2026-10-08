import { DEFAULT_CONFIG } from "./defaults";
import { getConfigRaw, onConfigRawChanged, saveConfigRaw } from "./seed";
import { LATEST_WINDOW_HOURS } from "./constants";
import type { AppConfig, AppSettings, Category, DesignTheme, Page, Source } from "@/types";
import { validateConfig } from "./validate";

function cloneDefaults(): AppConfig {
  return structuredClone(DEFAULT_CONFIG);
}

function normalizeLatestWindowHours(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return LATEST_WINDOW_HOURS;
  const n = Math.min(24, Math.max(1, Math.round(value)));
  return n;
}

function normalizeConfig(config: AppConfig): AppConfig {
  const settings: AppSettings = {
    maxAgeHours:
      typeof config.settings?.maxAgeHours === "number" && config.settings.maxAgeHours >= 0
        ? config.settings.maxAgeHours
        : DEFAULT_CONFIG.settings?.maxAgeHours ?? 24,
    sortMode:
      config.settings?.sortMode === "top" || config.settings?.sortMode === "latest"
        ? config.settings.sortMode
        : (DEFAULT_CONFIG.settings?.sortMode ?? "latest"),
    designTheme:
      config.settings?.designTheme === "nyt" || config.settings?.designTheme === "broadsheet"
        ? config.settings.designTheme
        : (DEFAULT_CONFIG.settings?.designTheme ?? "broadsheet"),
    latestWindowHours: normalizeLatestWindowHours(
      config.settings?.latestWindowHours ?? DEFAULT_CONFIG.settings?.latestWindowHours
    ),
  };
  return { ...config, settings };
}

/**
 * Parsed+validated config memo. getConfig() runs on every request path call
 * (getEnabledPages, getPageConfig, getMaxAgeHours, getSortMode…) — without
 * this, each call re-reads SQLite, re-parses the JSON blob, and re-validates
 * ~100 sources. The memo is dropped the instant config is saved (listener in
 * seed.ts), so settings changes are visible on the very next call.
 */
let configMemo: AppConfig | null = null;
onConfigRawChanged(() => {
  configMemo = null;
});

export function getConfig(): AppConfig {
  if (configMemo) return configMemo;

  const raw = getConfigRaw();
  if (!raw) return cloneDefaults();

  try {
    const parsed = JSON.parse(raw) as AppConfig;
    const { valid } = validateConfig(parsed);
    if (!valid || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      console.warn("[config] Stored config invalid; using defaults.");
      return cloneDefaults();
    }
    configMemo = normalizeConfig(parsed);
    return configMemo;
  } catch (error) {
    console.warn("[config] Failed to parse stored config; using defaults.", error);
    return cloneDefaults();
  }
}

export function getMaxAgeHours(): number {
  return getConfig().settings?.maxAgeHours ?? 24;
}

export function getSortMode(): "latest" | "top" {
  return getConfig().settings?.sortMode ?? "latest";
}

export function getDesignTheme(): DesignTheme {
  return getConfig().settings?.designTheme ?? "broadsheet";
}

export function getLatestWindowHours(): number {
  return getConfig().settings?.latestWindowHours ?? LATEST_WINDOW_HOURS;
}

export function saveConfig(config: AppConfig): void {
  saveConfigRaw(JSON.stringify(config));
}

export function resetConfig(): AppConfig {
  const defaults = cloneDefaults();
  saveConfig(defaults);
  return defaults;
}

export function getEnabledPages(): Page[] {
  return getConfig()
    .pages.filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);
}

export function getPageConfig(pageId: string): Page | undefined {
  return getConfig().pages.find((p) => p.id === pageId);
}

export function reorderPages(pageIds: string[]): AppConfig {
  const config = getConfig();
  const byId = new Map(config.pages.map((p) => [p.id, p]));

  pageIds.forEach((id, index) => {
    const page = byId.get(id);
    if (page) page.order = index;
  });

  let next = config.pages.filter((p) => !pageIds.includes(p.id)).sort((a, b) => a.order - b.order);
  const reordered = [...config.pages]
    .filter((p) => pageIds.includes(p.id))
    .sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id))
    .map((p, i) => ({ ...p, order: i }));

  const tailStart = reordered.length;
  next = next.map((p, i) => ({ ...p, order: tailStart + i }));

  const updated: AppConfig = { pages: [...reordered, ...next] };
  saveConfig(updated);
  return updated;
}

export function toggleSource(pageId: string, sourceId: string): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    return {
      ...page,
      sources: page.sources.map((s) => (s.id === sourceId ? { ...s, enabled: !s.enabled } : s)),
    };
  });
  saveConfig(config);
  return config;
}

export function toggleCategory(pageId: string, categoryId: string): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    return {
      ...page,
      categories: page.categories.map((c) =>
        c.id === categoryId ? { ...c, enabled: !c.enabled } : c
      ),
    };
  });
  saveConfig(config);
  return config;
}

export function upsertCategory(
  pageId: string,
  category: Category,
  action: "add" | "update"
): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    if (action === "add") {
      if (page.categories.some((c) => c.id === category.id)) return page;
      return { ...page, categories: [...page.categories, category] };
    }
    return {
      ...page,
      categories: page.categories.map((c) => (c.id === category.id ? category : c)),
    };
  });
  saveConfig(config);
  return config;
}

export function deleteCategory(pageId: string, categoryId: string): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    return { ...page, categories: page.categories.filter((c) => c.id !== categoryId) };
  });
  saveConfig(config);
  return config;
}

export function upsertCustomFeed(pageId: string, source: Source, action: "add" | "update"): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    const nextSource: Source = { ...source, type: "rss", custom: true, enabled: true };
    if (action === "add") {
      if (page.sources.some((s) => s.id === nextSource.id)) return page;
      return { ...page, sources: [...page.sources, nextSource] };
    }
    return {
      ...page,
      sources: page.sources.map((s) => (s.id === nextSource.id ? nextSource : s)),
    };
  });
  saveConfig(config);
  return config;
}

export function deleteCustomFeed(pageId: string, sourceId: string): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) => {
    if (page.id !== pageId) return page;
    return { ...page, sources: page.sources.filter((s) => s.id !== sourceId) };
  });
  saveConfig(config);
  return config;
}

export function setPageRefreshInterval(pageId: string, minutes: number): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) =>
    page.id === pageId ? { ...page, refreshIntervalMinutes: minutes } : page
  );
  saveConfig(config);
  return config;
}

export function setPageEnabled(pageId: string, enabled: boolean): AppConfig {
  const config = getConfig();
  config.pages = config.pages.map((page) =>
    page.id === pageId ? { ...page, enabled } : page
  );
  saveConfig(config);
  return config;
}

export { cloneDefaults as cloneDefaultConfig };

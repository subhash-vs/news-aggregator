/**
 * Merge missing default sources/pages into the stored SQLite config.
 * Safe to re-run: only adds what is absent; never removes user changes.
 */
import { DEFAULT_CONFIG } from "../src/lib/defaults";
import { getConfig, saveConfig } from "../src/lib/config";
import type { AppConfig, Page, Source } from "../src/types";

function mergeSources(existing: Source[], additions: Source[]): { sources: Source[]; added: string[]; updated: string[] } {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const added: string[] = [];
  const updated: string[] = [];
  for (const source of additions) {
    const current = byId.get(source.id);
    if (!current) {
      byId.set(source.id, source);
      added.push(source.name);
      continue;
    }
    if (current.custom) continue;
    // Sync feedUrl/config from defaults when the stored URL no longer matches
    const urlChanged = current.config?.feedUrl !== source.config?.feedUrl;
    const subredditChanged = current.config?.subreddit !== source.config?.subreddit;
    const sectionChanged = current.config?.section !== source.config?.section;
    if (urlChanged || subredditChanged || sectionChanged) {
      byId.set(source.id, { ...current, config: source.config });
      updated.push(`${source.name} url`);
    }
  }
  return { sources: [...byId.values()], added, updated };
}

function mergeCategories(existing: Page["categories"], additions: Page["categories"]) {
  const byId = new Map(existing.map((c) => [c.id, c]));
  const added: string[] = [];
  for (const category of additions) {
    if (byId.has(category.id)) continue;
    byId.set(category.id, category);
    added.push(category.label);
  }
  return { categories: [...byId.values()], added };
}

function mergePage(existing: Page | undefined, template: Page) {
  if (!existing) {
    return { page: { ...template }, addedSources: template.sources.map((s) => s.name), addedCategories: template.categories.map((c) => c.label), updatedSources: [] as string[], isNew: true };
  }
  const { sources, added: addedSources, updated: updatedSources } = mergeSources(existing.sources, template.sources);
  const { categories, added: addedCategories } = mergeCategories(existing.categories, template.categories);
  return {
    page: { ...existing, sources, categories },
    addedSources,
    addedCategories,
    updatedSources,
    isNew: false,
  };
}

function main() {
  const current: AppConfig = getConfig();
  const pageOrder = new Map(current.pages.map((p, i) => [p.id, i]));
  let pages = [...current.pages];
  let changed = false;

  for (const template of DEFAULT_CONFIG.pages) {
    const existing = pages.find((p) => p.id === template.id);
    const { page, addedSources, addedCategories, updatedSources = [], isNew } = mergePage(existing, template);

    if (isNew) {
      // Insert after the last known default page order, before trailing customs
      const templateOrder = template.order;
      const ordered = [...pages, page].sort((a, b) => {
        const ao = DEFAULT_CONFIG.pages.find((d) => d.id === a.id)?.order ?? a.order;
        const bo = DEFAULT_CONFIG.pages.find((d) => d.id === b.id)?.order ?? b.order;
        return ao - bo || pageOrder.get(a.id)! - pageOrder.get(b.id)!;
      });
      pages = ordered.map((p, i) => ({ ...p, order: i }));
      void templateOrder;
      console.log(`+ page ${page.id} (${page.label}) with ${page.sources.length} sources`);
      changed = true;
    } else if (addedSources.length || addedCategories.length || updatedSources.length) {
      pages = pages.map((p) => (p.id === page.id ? page : p));
      console.log(
        `~ ${page.id}: +${addedSources.length} source(s)${addedSources.length ? ` [${addedSources.join(", ")}]` : ""}` +
          `${updatedSources.length ? ` ~${updatedSources.length} url(s) [${updatedSources.join(", ")}]` : ""}` +
          `${addedCategories.length ? ` +${addedCategories.length} category(s) [${addedCategories.join(", ")}]` : ""}`
      );
      changed = true;
    }
  }

  // Keep stable order: top, latest, world, finance, technology, india, movies, sports, then customs
  const preferred = ["top", "latest", "world", "finance", "technology", "india", "movies", "sports"];
  pages = pages
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ap = preferred.indexOf(a.p.id);
      const bp = preferred.indexOf(b.p.id);
      if (ap !== -1 || bp !== -1) {
        return (ap === -1 ? 99 : ap) - (bp === -1 ? 99 : bp) || a.i - b.i;
      }
      return a.i - b.i;
    })
    .map(({ p }, i) => ({ ...p, order: i }));

  if (!changed) {
    console.log("Config already up to date.");
    return;
  }

  const next: AppConfig = {
    ...current,
    pages,
    settings: current.settings ?? DEFAULT_CONFIG.settings,
  };
  saveConfig(next);
  console.log("Saved merged config.");
  console.log(
    "Pages:",
    next.pages.map((p) => `${p.order}:${p.id}(${p.sources.length})`).join(", ")
  );
}

main();

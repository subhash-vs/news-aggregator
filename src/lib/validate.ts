import type { AppConfig, ValidationResult } from "@/types";
import { MAX_YAHOO_SYMBOLS } from "./yahoo-finance";

const VALID_TYPES = new Set(["guardian", "hn", "reddit", "rss"]);

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateConfig(config: unknown): ValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { valid: false, errors: ["Config must be an object"] };
  }

  const c = config as Partial<AppConfig>;

  if (c.settings !== undefined) {
    if (!c.settings || typeof c.settings !== "object") {
      errors.push("settings must be an object");
    } else {
      if (typeof c.settings.maxAgeHours !== "number" || c.settings.maxAgeHours < 0) {
        errors.push("settings.maxAgeHours must be a non-negative number");
      }
      if (
        c.settings.sortMode !== undefined &&
        c.settings.sortMode !== "latest" &&
        c.settings.sortMode !== "top"
      ) {
        errors.push('settings.sortMode must be "latest" or "top"');
      }
      if (
        c.settings.designTheme !== undefined &&
        c.settings.designTheme !== "broadsheet" &&
        c.settings.designTheme !== "nyt"
      ) {
        errors.push('settings.designTheme must be "broadsheet" or "nyt"');
      }
      if (c.settings.latestWindowHours !== undefined) {
        const n = c.settings.latestWindowHours;
        if (typeof n !== "number" || !Number.isFinite(n) || n < 1 || n > 24) {
          errors.push("settings.latestWindowHours must be a number between 1 and 24");
        }
      }
      if (c.settings.yahooFinanceSymbols !== undefined) {
        const s = c.settings.yahooFinanceSymbols;
        if (!Array.isArray(s) || s.some((x) => typeof x !== "string")) {
          errors.push("settings.yahooFinanceSymbols must be an array of strings");
        } else if (s.length > MAX_YAHOO_SYMBOLS) {
          errors.push(
            `settings.yahooFinanceSymbols must have at most ${MAX_YAHOO_SYMBOLS} symbols`
          );
        }
      }
    }
  }

  if (!Array.isArray(c.pages) || c.pages.length === 0) {
    return { valid: false, errors: ["pages must be a non-empty array"] };
  }

  const seenPageIds = new Set<string>();

  c.pages.forEach((page, i) => {
    const prefix = `pages[${i}]`;

    if (!page || typeof page !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!page.id || typeof page.id !== "string") {
      errors.push(`${prefix}.id is required`);
    } else if (seenPageIds.has(page.id)) {
      errors.push(`${prefix}.id duplicate: ${page.id}`);
    } else {
      seenPageIds.add(page.id);
    }

    if (!page.label || typeof page.label !== "string") {
      errors.push(`${prefix}.label is required`);
    }

    if (typeof page.order !== "number" || Number.isNaN(page.order)) {
      errors.push(`${prefix}.order must be a number`);
    }

    if (typeof page.enabled !== "boolean") {
      errors.push(`${prefix}.enabled must be a boolean`);
    }

    if (page.refreshIntervalMinutes !== undefined) {
      const n = page.refreshIntervalMinutes;
      if (typeof n !== "number" || n < 0 || !Number.isFinite(n)) {
        errors.push(`${prefix}.refreshIntervalMinutes must be a non-negative number`);
      }
    }

    if (!Array.isArray(page.sources)) {
      errors.push(`${prefix}.sources must be an array`);
      return;
    }

    if (!Array.isArray(page.categories)) {
      errors.push(`${prefix}.categories must be an array`);
      return;
    }

    const seenSourceIds = new Set<string>();

    page.sources.forEach((source, j) => {
      const sPrefix = `${prefix}.sources[${j}]`;
      if (!source || typeof source !== "object") {
        errors.push(`${sPrefix} must be an object`);
        return;
      }
      if (!source.id || typeof source.id !== "string") {
        errors.push(`${sPrefix}.id is required`);
      } else if (seenSourceIds.has(source.id)) {
        errors.push(`${sPrefix}.id duplicate: ${source.id}`);
      } else {
        seenSourceIds.add(source.id);
      }
      if (!source.type || !VALID_TYPES.has(source.type)) {
        errors.push(`${sPrefix}.type must be one of guardian|hn|reddit|rss`);
      }
      if (!source.name || typeof source.name !== "string") {
        errors.push(`${sPrefix}.name is required`);
      }
      if (typeof source.enabled !== "boolean") {
        errors.push(`${sPrefix}.enabled must be a boolean`);
      }
      if (!source.config || typeof source.config !== "object") {
        errors.push(`${sPrefix}.config must be an object`);
        return;
      }
      if (source.type === "rss") {
        const feedUrl = source.config.feedUrl;
        if (!feedUrl || typeof feedUrl !== "string" || !isValidHttpUrl(feedUrl)) {
          errors.push(`${sPrefix}.config.feedUrl must be a valid http(s) URL`);
        }
      }
      if (source.type === "reddit" && !source.config.subreddit) {
        errors.push(`${sPrefix}.config.subreddit is required`);
      }
      if (source.type === "guardian" && !source.config.section) {
        errors.push(`${sPrefix}.config.section is required`);
      }
    });

    page.categories.forEach((category, j) => {
      const cPrefix = `${prefix}.categories[${j}]`;
      if (!category || typeof category !== "object") {
        errors.push(`${cPrefix} must be an object`);
        return;
      }
      if (!category.id || typeof category.id !== "string") {
        errors.push(`${cPrefix}.id is required`);
      }
      if (!category.label || typeof category.label !== "string") {
        errors.push(`${cPrefix}.label is required`);
      }
      if (!Array.isArray(category.keywords)) {
        errors.push(`${cPrefix}.keywords must be an array`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

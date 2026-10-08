import { db } from "./db";
import { DEFAULT_CONFIG } from "./defaults";

/* Hoisted — see db.ts note. */
const stmtGetConfig = db.prepare("SELECT value FROM config WHERE key = ?");

/**
 * Raw config blob memo. The DB read is skipped entirely until a write
 * happens — saveConfigRaw invalidates via the same listener registry that
 * config.ts uses, so every reader sees fresh data immediately after a save.
 */
let rawMemo: string | null | undefined;

export function getConfigRaw(): string | null {
  if (rawMemo !== undefined) return rawMemo;
  const row = stmtGetConfig.get("app_config") as { value: string } | undefined;
  rawMemo = row?.value ?? null;
  return rawMemo;
}

/* Notified whenever app_config is written — lets config.ts drop its memo. */
const rawChangeListeners = new Set<() => void>();

export function onConfigRawChanged(listener: () => void): void {
  rawChangeListeners.add(listener);
}

export function saveConfigRaw(json: string): void {
  try {
    db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES ('app_config', @value, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `).run({ value: json });
  } finally {
    // Invalidate even on write failure so we never serve a memo that
    // diverges from what's actually in the database.
    rawMemo = undefined;
    for (const listener of rawChangeListeners) listener();
  }
}

export function seed(): void {
  saveConfigRaw(JSON.stringify(DEFAULT_CONFIG));
  console.log(`Seeded default config (${DEFAULT_CONFIG.pages.length} pages).`);
}

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");

if (isMain) {
  seed();
}

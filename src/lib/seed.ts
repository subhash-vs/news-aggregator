import { db } from "./db";
import { DEFAULT_CONFIG } from "./defaults";

export function getConfigRaw(): string | null {
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get("app_config") as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function saveConfigRaw(json: string): void {
  db.prepare(`
    INSERT INTO config (key, value, updated_at)
    VALUES ('app_config', @value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `).run({ value: json });
}

export function seed(): void {
  saveConfigRaw(JSON.stringify(DEFAULT_CONFIG));
  console.log(`Seeded default config (${DEFAULT_CONFIG.pages.length} pages).`);
}

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");

if (isMain) {
  seed();
}

# Brief 2.7 — Config validation

## What you achieve
Robust config validation and error handling.

## Goal
Invalid config rejected with clear error messages. Defaults applied gracefully.

## Context
User can misconfigure. App must handle it.

## Do
- Create `src/lib/validate.ts`:
  - `validateConfig(config: unknown): { valid: boolean; errors: string[] }`
  - Validate required fields, types, URL formats
  - Validate page order contains all pages
  - Validate source types match enum
- Update settings UI:
  - Show validation errors inline
  - Highlight invalid fields
  - Prevent save if invalid
- Update config loading:
  - Fallback to defaults if DB config corrupted

## Don't
Schema migration, complex validation rules.

## Files
`src/lib/validate.ts`, `src/components/settings/SettingsLayout.tsx`, `src/lib/config.ts`

## Verify
Submit invalid config. Errors shown. Valid config saves.

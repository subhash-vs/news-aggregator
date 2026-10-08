/**
 * Yahoo Finance watchlist feed.
 *
 * Yahoo decommissioned its general finance RSS (finance.yahoo.com/news/rssindex
 * went 404 in Oct 2026; feeds.finance.yahoo.com/rss/2.0 general endpoint is
 * gone too). The per-symbol headline feed still works and accepts multiple
 * comma-separated symbols, so the "Yahoo Finance" coverage is now driven by a
 * user-configurable watchlist (settings.yahooFinanceSymbols).
 */

export const DEFAULT_YAHOO_SYMBOLS = ["VOO", "VTI", "CRM", "MU"];

/** Hard cap — bounds URL length and per-refresh feed weight on the 512MB VM. */
export const MAX_YAHOO_SYMBOLS = 12;

/** Ticker charset: letters/digits plus share classes (BRK.B), classes (BF-B), indices (^GSPC). */
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,10}$/;

/**
 * Sanitize a raw symbol list: trim, uppercase, drop invalid tokens, dedupe,
 * cap. Falls back to the defaults when nothing valid remains — an empty
 * watchlist would produce a dead feed URL.
 */
export function normalizeYahooSymbols(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_YAHOO_SYMBOLS];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const sym = entry.trim().toUpperCase();
    if (!SYMBOL_RE.test(sym)) continue;
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
    if (out.length >= MAX_YAHOO_SYMBOLS) break;
  }
  return out.length > 0 ? out : [...DEFAULT_YAHOO_SYMBOLS];
}

/** Parse free-typed text ("VOO vti, CRM") into a sanitized symbol list. */
export function parseYahooSymbols(text: string): string[] {
  return normalizeYahooSymbols(text.split(/[,\s]+/));
}

/**
 * Build the watchlist feed URL. Symbols are comma-joined without encoding —
 * Yahoo accepts raw commas and carets in the query (verified live), and the
 * fetcher passes the URL straight to fetch().
 */
export function yahooFeedUrl(symbols: string[]): string | null {
  const clean = normalizeYahooSymbols(symbols);
  if (clean.length === 0) return null;
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${clean.join(",")}&region=US&lang=en-US`;
}

/** Default lookback window for the Latest tab. */
export const LATEST_WINDOW_HOURS = 2;

/** Nav tabs that are not RSS-backed content pages. */
export const SPECIAL_PAGE_IDS = new Set(["top", "latest"]);

/** Always-shown utility links (not part of page order). */
export const UTILITY_NAV_LINKS: Array<{ id: string; label: string }> = [
  { id: "bookmarks", label: "Bookmarks" },
  { id: "settings", label: "Settings" },
];


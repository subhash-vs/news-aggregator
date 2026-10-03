const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  trade: "™",
  copy: "©",
  reg: "®",
  middot: "·",
  bull: "•",
  deg: "°",
  plusmn: "±",
  frac12: "½",
  times: "×",
  divide: "÷",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
};

/** Decode HTML entities (&#8217;, &rsquo;, &amp;, etc.) in plain text. */
export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      const key = name.toLowerCase();
      if (key in NAMED) return NAMED[key];
      return match;
    });
}

/** Normalize feed text: decode entities, strip tags, collapse whitespace. */
export function cleanText(input: string | null | undefined, maxLength?: number): string {
  let text = decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (maxLength && text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return text;
}

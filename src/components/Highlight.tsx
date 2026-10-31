import { Fragment, type ReactNode } from "react";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap case-insensitive matches of `tokens` in <mark>. Tokens come from
 * `tokenize()` (already normalized), so they start/end with letters or
 * digits — the \b boundary keeps "ai" from matching inside "rain".
 */
export function Highlight({
  text,
  tokens,
}: {
  text: string;
  tokens: string[];
}): ReactNode {
  if (tokens.length === 0) return <>{text}</>;

  const pattern = tokens.map((token) => `\\b${escapeRegExp(token)}`).join("|");
  let parts: string[];
  try {
    // Capture group so String.split keeps the matched separators.
    parts = text.split(new RegExp(`(${pattern})`, "giu"));
  } catch {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="bg-accent/15 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}

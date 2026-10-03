import type { SourceType } from "@/types";

const STYLES: Record<SourceType | "default", string> = {
  guardian: "text-accent",
  hn: "text-foreground",
  reddit: "text-foreground",
  rss: "text-foreground",
  default: "text-muted-foreground",
};

function inferType(source: string): SourceType | "default" {
  const s = source.toLowerCase();
  if (s.includes("guardian")) return "guardian";
  if (s.includes("hacker") || s.includes("hn")) return "hn";
  if (s.includes("reddit")) return "reddit";
  return "default";
}

export function SourceBadge({ source }: { source: string }) {
  const type = inferType(source);
  return (
    <span className={`meta-line ${STYLES[type]}`}>
      <span className="line-clamp-1">{source}</span>
    </span>
  );
}

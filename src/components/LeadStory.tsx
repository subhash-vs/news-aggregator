"use client";

import { useState } from "react";
import type { Article } from "@/types";
import { BookmarkButton } from "@/components/BookmarkButton";
import { timeAgo } from "@/lib/time";

/**
 * Front-page lead story — design system:
 * kicker → oversized headline → short rule → 16:9 photo → summary → meta
 */
export function LeadStory({
  article,
  bookmarked,
  onBookmarkChange,
  label = "Lead story",
}: {
  article: Article;
  bookmarked?: boolean;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
  label?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!article.thumbnail && !imageFailed;
  const kicker = article.category || label;
  const summary = article.summary?.trim();

  return (
    <article className="mb-8">
      <div className="mb-3">
        <div className="rule-thick mb-3" />
        <p className="kicker">{kicker}</p>
      </div>

      <h2 className="max-w-4xl font-display text-[clamp(1.85rem,4.8vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.015em] text-foreground">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="headline-link"
        >
          {article.title}
        </a>
      </h2>

      <div className="rule-hair mt-4 max-w-4xl" />

      {showImage && article.thumbnail ? (
        <figure className="mt-4 max-w-4xl">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.thumbnail}
              alt=""
              decoding="async"
              onError={() => setImageFailed(true)}
              className="newsprint-image h-full w-full object-cover"
            />
          </div>
        </figure>
      ) : null}

      <div className="mt-4 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {summary ? (
            <p className="drop-cap font-serif text-base leading-[1.65] text-foreground/90">
              {summary}
            </p>
          ) : null}

          <p className="meta-line mt-3">
            <span className="text-foreground">{article.source}</span>
            {" · "}
            <time dateTime={article.publishedAt ?? undefined}>
              {timeAgo(article.publishedAt)}
            </time>
            {typeof article.heat === "number" ? (
              <span className="ml-2 text-accent">· heat {article.heat}</span>
            ) : null}
            {typeof article.score === "number" && article.score > 0 ? (
              <span className="ml-2 text-accent">· {article.score} pts</span>
            ) : null}
          </p>
        </div>

        <BookmarkButton
          article={article}
          bookmarked={bookmarked}
          onChange={(value) => onBookmarkChange?.(article.id, value)}
        />
      </div>
    </article>
  );
}

export function LeadStorySkeleton() {
  return (
    <div className="mb-8" aria-hidden>
      <div className="rule-thick mb-3" />
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-4 h-10 w-full max-w-4xl" />
      <div className="skeleton mt-2 h-10 w-3/4 max-w-4xl" />
      <div className="skeleton mt-4 aspect-[16/9] w-full max-w-4xl" />
      <div className="skeleton mt-4 h-4 w-2/3 max-w-4xl" />
      <div className="skeleton mt-2 h-3 w-40" />
    </div>
  );
}

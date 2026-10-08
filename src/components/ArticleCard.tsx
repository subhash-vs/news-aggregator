"use client";

import type { Article } from "@/types";
import { BookmarkButton } from "@/components/BookmarkButton";
import { timeAgo } from "@/lib/time";
import { useState } from "react";

export function ArticleCard({
  article,
  bookmarked,
  onBookmarkChange,
  showBookmark = true,
}: {
  article: Article;
  bookmarked?: boolean;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
  showBookmark?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!article.thumbnail && !imageFailed;

  return (
    <article className="flex h-full flex-col border-b border-border pb-4 px-0 sm:px-3">
      {showImage && article.thumbnail ? (
        <div className="relative mb-3 aspect-[3/2] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="newsprint-image h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="meta-line">
            {article.source}
            {typeof article.score === "number" && article.score > 0 ? (
              <span className="ml-2 text-accent">· {article.score} pts</span>
            ) : null}
          </p>
          {showBookmark ? (
            <BookmarkButton
              article={article}
              bookmarked={bookmarked}
              onChange={(value) => onBookmarkChange?.(article.id, value)}
            />
          ) : null}
        </div>

        <h3 className="font-display text-[1.15rem] font-bold leading-[1.2] tracking-[-0.01em] text-foreground md:text-[1.35rem] md:leading-[1.18]">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="headline-link"
          >
            {article.title}
          </a>
        </h3>

        {article.category ? (
          <p className="kicker">{article.category}</p>
        ) : null}

        <p className="meta-line mt-auto pt-1">
          <time dateTime={article.publishedAt ?? undefined}>{timeAgo(article.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="flex h-full flex-col border-b border-border pb-4" aria-hidden>
      <div className="skeleton mb-3 aspect-[3/2] w-full" />
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-2 h-4 w-full" />
      <div className="skeleton mt-2 h-4 w-4/5" />
      <div className="skeleton mt-3 h-3 w-28" />
    </div>
  );
}

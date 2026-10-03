import type { Article } from "@/types";
import { ArticleCard } from "@/components/ArticleCard";

function articleKey(article: Article): string {
  return `${article.source}:${article.id}:${article.url}`;
}

export function ArticleGrid({
  articles,
  bookmarkedIds,
  onBookmarkChange,
}: {
  articles: Article[];
  bookmarkedIds?: Set<string>;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
}) {
  return (
    <div className="grid grid-cards grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard
          key={articleKey(article)}
          article={article}
          bookmarked={bookmarkedIds?.has(article.id)}
          onBookmarkChange={onBookmarkChange}
        />
      ))}
    </div>
  );
}

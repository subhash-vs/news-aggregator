import { ArticleCardSkeleton } from "@/components/ArticleCard";

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cards grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Loading articles"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

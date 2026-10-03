"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import type { Article } from "@/types";
import { useToast } from "@/components/Toast";

export function BookmarkButton({
  article,
  bookmarked: initialBookmarked = false,
  onChange,
}: {
  article: Article;
  bookmarked?: boolean;
  onChange?: (bookmarked: boolean) => void;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { bookmarked: boolean };
      setBookmarked(data.bookmarked);
      onChange?.(data.bookmarked);
      toast(data.bookmarked ? "Saved to bookmarks" : "Removed bookmark");
    } catch {
      toast("Could not update bookmark");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
      aria-pressed={bookmarked}
      className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-accent disabled:opacity-50"
    >
      {bookmarked ? (
        <BookmarkCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
      ) : (
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}

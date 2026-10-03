"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AppConfig, Category } from "@/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function CategoryConfig({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}) {
  const pages = [...config.pages].sort((a, b) => a.order - b.order);
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId) ?? pages[0];

  const [label, setLabel] = useState("");
  const [keywords, setKeywords] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const idCounter = useRef(0);

  function updateCategories(next: Category[]) {
    if (!page) return;
    onChange({
      ...config,
      pages: config.pages.map((p) => (p.id === page.id ? { ...p, categories: next } : p)),
    });
  }

  function startEdit(category: Category) {
    setEditId(category.id);
    setLabel(category.label);
    setKeywords(category.keywords.join(", "));
  }

  function clearForm() {
    setEditId(null);
    setLabel("");
    setKeywords("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!page || !label.trim()) return;

    const kw = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (editId) {
      updateCategories(
        page.categories.map((c) =>
          c.id === editId ? { ...c, label: label.trim(), keywords: kw } : c
        )
      );
    } else {
      const id = slugify(label) || `cat-${page.id}-${++idCounter.current}`;
      if (page.categories.some((c) => c.id === id)) return;
      updateCategories([
        ...page.categories,
        { id, label: label.trim(), enabled: true, keywords: kw },
      ]);
    }

    clearForm();
  }

  function remove(id: string) {
    if (!page) return;
    updateCategories(page.categories.filter((c) => c.id !== id));
  }

  function toggle(id: string) {
    if (!page) return;
    updateCategories(
      page.categories.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  }

  if (!page) return <p className="text-sm text-muted-foreground">No pages configured.</p>;

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Sub-categories</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Group articles by topic. Keywords match titles and sources.
      </p>

      <label className="section-label mb-3 block text-foreground">
        Page
        <select
          value={page.id}
          onChange={(e) => {
            setPageId(e.target.value);
            clearForm();
          }}
          className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground font-serif text-foreground sm:max-w-xs"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={submit} className="mb-6 space-y-3 border border-border bg-background p-4">
        <h3 className="font-display font-bold text-foreground">{editId ? "Edit category" : "Add category"}</h3>
        <label className="block text-sm">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="e.g. Cricket"
            className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground"
          />
        </label>
        <label className="block text-sm">
          Keywords (comma-separated)
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="cricket, ipl, test match"
            className="mt-1 w-full border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {editId ? "Update" : "Add"}
          </button>
          {editId ? (
            <button
              type="button"
              onClick={clearForm}
              className="border border-border px-3 py-2 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-2">
        {page.categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-foreground">{category.label}</p>
              <p className="text-xs text-muted-foreground">
                {category.keywords.length ? category.keywords.join(", ") : "No keywords"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={category.enabled}
                  onChange={() => toggle(category.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => startEdit(category)}
                className="border border-border px-2 py-1 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(category.id)}
                aria-label={`Delete ${category.label}`}
                className="inline-flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

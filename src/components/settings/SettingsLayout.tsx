"use client";

export function SettingsLayout({
  tab,
  onTabChange,
  onSave,
  onCancel,
  onReset,
  saving,
  dirty,
  errors,
  children,
}: {
  tab: "pages" | "sources" | "categories" | "feeds";
  onTabChange: (tab: "pages" | "sources" | "categories" | "feeds") => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  saving: boolean;
  dirty: boolean;
  errors: string[];
  children: React.ReactNode;
}) {
  const tabs = [
    { id: "pages", label: "Pages" },
    { id: "sources", label: "Sources" },
    { id: "categories", label: "Categories" },
    { id: "feeds", label: "Custom feeds" },
  ] as const;

  return (
    <div className="border border-border bg-card">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap border-b border-border"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTabChange(item.id)}
            className={`section-label border-r border-border px-4 py-3 transition-colors ${
              tab === item.id
                ? "bg-muted text-accent"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6" role="tabpanel">
        {errors.length > 0 ? (
          <div
            role="alert"
            className="mb-4 border-l-4 border-destructive bg-muted px-3 py-2 text-sm text-destructive"
          >
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {children}
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="meta-line">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="section-label border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || !dirty}
            className="section-label border border-border px-3 py-2 text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="section-label bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

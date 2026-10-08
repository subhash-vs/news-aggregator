"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppConfig } from "@/types";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { PageReorder } from "@/components/settings/PageReorder";
import { SourceConfig } from "@/components/settings/SourceConfig";
import { CategoryConfig } from "@/components/settings/CategoryConfig";
import { CustomFeedConfig } from "@/components/settings/CustomFeedConfig";
import { AutoRefreshSettings } from "@/components/settings/AutoRefreshSettings";
import { TimeWindowSettings } from "@/components/settings/TimeWindowSettings";
import { DesignThemeSettings } from "@/components/settings/DesignThemeSettings";
import { YahooWatchlistSettings } from "@/components/settings/YahooWatchlistSettings";
import { applyDesignTheme } from "@/components/DesignTheme";
import { useToast } from "@/components/Toast";

type TabId = "pages" | "sources" | "categories" | "feeds";

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("pages");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { config: AppConfig };
      setConfig(data.config);
      setDraft(structuredClone(data.config));
      setErrors([]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Data fetch: setState only after network response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(draft);
  }, [config, draft]);

  function applyLocal(next: AppConfig) {
    setDraft(next);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft }),
      });
      const data = (await res.json()) as { config?: AppConfig; errors?: string[]; error?: string };
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? "Invalid config"]);
        toast("Config not saved — fix errors");
        return;
      }
      if (data.config) {
        setConfig(data.config);
        setDraft(structuredClone(data.config));
        if (data.config.settings?.designTheme) {
          applyDesignTheme(data.config.settings.designTheme);
        }
      }
      setErrors([]);
      toast("Config saved");
    } catch {
      toast("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!config) return;
    setDraft(structuredClone(config));
    setErrors([]);
  }

  async function resetDefaults() {
    if (!window.confirm("Reset all settings to defaults?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = (await res.json()) as { config: AppConfig };
      setConfig(data.config);
      setDraft(structuredClone(data.config));
      setErrors([]);
      applyDesignTheme(data.config.settings?.designTheme ?? "broadsheet");
      toast("Reset to defaults");
    } catch {
      toast("Reset failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48 " />
        <div className="skeleton h-64 w-full " />
      </div>
    );
  }

return (
    <div>
      <header className="mb-6">
        <div className="rule-thick mb-3" />
        <h1 className="font-masthead text-[clamp(1.75rem,4.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.01em]">
          Settings
        </h1>
        <p className="mt-1 font-serif text-sm leading-[1.5] text-muted-foreground">
          Configure page order, sources, categories, and custom feeds.
        </p>
      </header>

      <SettingsLayout
        tab={tab}
        onTabChange={setTab}
        onSave={save}
        onCancel={cancel}
        onReset={resetDefaults}
        saving={saving}
        dirty={dirty}
        errors={errors}
      >
        {tab === "pages" ? (
          <div className="space-y-8">
            <DesignThemeSettings config={draft} onChange={applyLocal} />
            <TimeWindowSettings config={draft} onChange={applyLocal} />
            <YahooWatchlistSettings config={draft} onChange={applyLocal} />
            <PageReorder config={draft} onChange={applyLocal} />
            <AutoRefreshSettings config={draft} onChange={applyLocal} />
          </div>
        ) : null}
        {tab === "sources" ? <SourceConfig config={draft} onChange={applyLocal} /> : null}
        {tab === "categories" ? <CategoryConfig config={draft} onChange={applyLocal} /> : null}
        {tab === "feeds" ? <CustomFeedConfig config={draft} onChange={applyLocal} /> : null}
      </SettingsLayout>
    </div>
  );
}

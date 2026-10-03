import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DesignThemeToggle, DesignThemeBridge } from "@/components/DesignTheme";
import { getDesignTheme, getEnabledPages } from "@/lib/config";

export const dynamic = "force-dynamic";

function dateLine(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pages = getEnabledPages().map((p) => ({ id: p.id, label: p.label }));
  const designTheme = getDesignTheme();

  return (
    <div className="flex min-h-full flex-col">
      <DesignThemeBridge designTheme={designTheme} />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* Thin top bar — date / edition / theme */}
          <div className="meta-line flex items-center justify-between gap-3 border-b border-border py-2">
            <span className="min-w-0 flex-1 truncate">{dateLine()}</span>
            <span className="hidden shrink-0 sm:inline">World Edition</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden sm:inline">Vol. I · No. 1</span>
              <DesignThemeToggle />
              <ThemeToggle />
            </span>
          </div>

          {/* Centered nameplate, flanked by double rules */}
          <div className="rule-thick" />
          <div className="flex justify-center py-4 sm:py-5">
            <Link
              href="/"
              className="text-center font-masthead text-[clamp(1.75rem,7vw,4rem)] font-bold leading-none tracking-[-0.01em] text-foreground"
            >
              {designTheme === "nyt" ? "The Daily Ledger" : "My World News"}
            </Link>
          </div>
          <div className="rule-thick" />

          {/* Section navigation strip */}
          <div className="flex justify-center py-1">
            <Nav pages={pages} />
          </div>

          <div className="rule-hair" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mt-10 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-center sm:px-6">
          <div className="rule-thick mb-4" />
          <p className="font-masthead text-2xl font-bold tracking-[-0.01em]">
            {designTheme === "nyt" ? "The Daily Ledger" : "My World News"}
          </p>
          <p className="meta-line mt-2">
            Links to original sources · No copies · Free tier first
          </p>
          <p className="meta-line mt-1">
            Powered by Next.js · Guardian · NYT · BBC · CNBC · DW · HN · RSS
          </p>
        </div>
      </footer>
    </div>
  );
}

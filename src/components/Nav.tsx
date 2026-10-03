"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { UTILITY_NAV_LINKS } from "@/lib/constants";

export function pageHref(pageId: string): string {
  return pageId === "world" ? "/" : `/${pageId}`;
}

export function isPageActive(pathname: string, pageId: string): boolean {
  const href = pageHref(pageId);
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavPage {
  id: string;
  label: string;
}

export function Nav({ pages }: { pages: NavPage[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Order comes from Settings → Page order (includes Top & Latest).
  // Bookmarks/Settings stay pinned at the end.
  const links = [...pages, ...UTILITY_NAV_LINKS];

  return (
    <nav aria-label="Primary" className="relative w-full">
      <button
        type="button"
        className="section-label inline-flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-foreground font-serif text-foreground transition-colors hover:text-accent md:hidden"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Sections</span>
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>

      <ul
        id="primary-nav"
        className={
          open
            ? "absolute right-0 top-full z-50 mt-2 flex w-56 flex-col gap-0 border border-border bg-card p-1 md:static md:z-auto md:mt-0 md:w-auto md:flex-row md:items-center md:gap-0 md:border-0 md:bg-transparent md:p-0"
            : "hidden md:flex md:items-center md:gap-0"
        }
      >
        {links.map((link, index) => {
          const active = isPageActive(pathname, link.id);
          return (
            <li key={link.id} className={index > 0 ? "md:border-l md:border-border" : ""}>
              <Link
                href={pageHref(link.id)}
                aria-current={active ? "page" : undefined}
                className={`section-label block px-3 py-2 transition-colors ${
                  active
                    ? "text-accent"
                    : "text-foreground hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

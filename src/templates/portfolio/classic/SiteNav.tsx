"use client";

import { useEffect, useState } from "react";
import { IdCard, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * The doctor's own site navbar: name on the left, section links and
 * "Visiting card" on the right. Below lg the links fold into a menu.
 * Gains a border and shadow once the page scrolls.
 */
export function SiteNav({
  name,
  tagline,
  links,
  cardHref,
}: {
  name: string;
  tagline?: string;
  links: NavLink[];
  /** "Visiting card" button target; omitted = no button. */
  cardHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-paper/90 backdrop-blur transition-[border-color,box-shadow] duration-200",
        solid || open ? "border-line shadow-[0_1px_2px_rgba(14,59,60,.06)]" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6 lg:h-[72px]">
        <a href="#top" className="mr-auto flex min-w-0 items-center" onClick={() => setOpen(false)}>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[17px] font-semibold text-ink sm:text-lg">{name}</span>
            {tagline && <span className="block truncate text-xs text-muted-foreground">{tagline}</span>}
          </span>
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-6 text-sm font-medium text-body lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="relative py-1 transition-colors hover:text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-marigold after:transition-transform hover:after:scale-x-100">
              {l.label}
            </a>
          ))}
        </nav>

        {cardHref && (
        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={cardHref}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-ink/15 bg-surface px-3.5 text-sm font-semibold text-ink transition hover:border-ink/40"
          >
            <IdCard aria-hidden className="size-4" strokeWidth={1.75} />
            Visiting card
          </a>
        </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-ink lg:hidden"
        >
          {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
        </button>
      </div>

      {open && (
        <nav id="site-menu" aria-label="Sections" className="border-t border-line bg-paper px-4 pb-5 sm:px-6 lg:hidden">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center border-b border-line text-base font-medium text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          {cardHref && (
          <a
            href={cardHref}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper"
          >
            <IdCard aria-hidden className="size-5" strokeWidth={1.75} />
            Digital visiting card
          </a>
          )}
        </nav>
      )}
    </header>
  );
}

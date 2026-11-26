"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Modern Edge header: a dark glass bar with a square monogram, a thin orange
 * scroll-progress line, and a full-screen menu on phones with large links.
 */
export function Nav({ name, monogram, tagline, links, phone }: { name: string; monogram: string; tagline?: string; links: NavLink[]; phone?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const y = window.scrollY + 160;
      let active = "";
      for (const l of links) {
        const el = document.querySelector<HTMLElement>(l.href);
        if (el && el.offsetTop <= y) active = l.href;
      }
      setCurrent(active);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [links]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      <div className={cn("relative z-50 transition-all duration-300", scrolled ? "bg-me-ink/95 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] backdrop-blur-xl" : "bg-transparent")}>
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-4 px-4 sm:px-6">
          <a href="#top" className="group flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center bg-me-orange text-[15px] font-bold tracking-tight text-white transition-transform duration-500 group-hover:rotate-90"
            >
              <span className="transition-transform duration-500 group-hover:-rotate-90">{monogram}</span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-bold uppercase tracking-[0.04em] text-white">{name}</span>
              {tagline && <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-me-sky">{tagline}</span>}
            </span>
          </a>

          <nav aria-label="Sections" className="ml-auto hidden lg:block">
            <ul className="flex items-center">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={current === l.href ? "true" : undefined}
                    className={cn(
                      "relative px-3 py-2 text-sm font-semibold transition-colors",
                      current === l.href ? "text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    {l.label}
                    {current === l.href && <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-[2px] bg-me-orange" />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-4">
            {phone && (
              <a
                href={`tel:+${phone}`}
                aria-label="Call the clinic"
                className="hidden size-11 items-center justify-center text-white ring-1 ring-white/20 transition hover:bg-white/10 sm:flex"
              >
                <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
              </a>
            )}
            <a
              href="#appointment"
              className="hidden h-11 items-center gap-2 bg-me-orange px-5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-me-orange-2 sm:inline-flex"
            >
              Book <ArrowUpRight aria-hidden className="size-4" strokeWidth={2.5} />
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="me-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative z-50 flex size-11 items-center justify-center text-white ring-1 ring-white/20 transition hover:bg-white/10 lg:hidden"
            >
              {open ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
            </button>
          </div>
        </div>
        <span aria-hidden className="me-scrollbar absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-me-orange" />
      </div>

      {/* Full-screen menu */}
      <div
        id="me-menu"
        className={cn(
          "me-grid-bg fixed inset-0 z-40 flex flex-col bg-me-ink px-6 pb-10 pt-24 transition-[clip-path] duration-700 ease-[cubic-bezier(.77,0,.18,1)] lg:hidden",
          open ? "[clip-path:inset(0_0_0_0)]" : "pointer-events-none invisible [clip-path:inset(0_0_100%_0)]",
        )}
      >
        <ul className="space-y-1">
          {links.map((l, i) => (
            <li key={l.href} className={cn("overflow-hidden")}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex py-2 text-4xl font-bold uppercase tracking-tight text-white transition-transform duration-700",
                  open ? "translate-y-0" : "translate-y-full",
                )}
                style={{ transitionDelay: open ? `${200 + i * 60}ms` : "0ms" }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid grid-cols-2 gap-3">
          {phone && (
            <a href={`tel:+${phone}`} className="flex h-14 items-center justify-center gap-2 font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
              <Phone aria-hidden className="size-4" /> Call
            </a>
          )}
          <a
            href="#appointment"
            onClick={() => setOpen(false)}
            className={cn("flex h-14 items-center justify-center gap-2 bg-me-orange font-bold uppercase tracking-wider text-white", !phone && "col-span-2")}
          >
            Book <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

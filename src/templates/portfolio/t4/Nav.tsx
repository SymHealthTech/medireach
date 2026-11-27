"use client";

import { useEffect, useState } from "react";
import { CalendarHeart, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Warm Heritage header, laid out like a letterhead: the doctor's name in the
 * centre with the links split either side. Clear over the hero photo, then a
 * cream bar with a thin saffron rule once the page scrolls. Phones get a
 * panel that drops down from the top.
 */
export function Nav({ name, tagline, links, phone }: { name: string; tagline?: string; links: NavLink[]; phone?: string }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 40);
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

  const light = solid || open;
  const half = Math.ceil(links.length / 2);
  const link = (l: NavLink) => (
    <a
      key={l.href}
      href={l.href}
      aria-current={current === l.href ? "true" : undefined}
      className={cn(
        "relative px-2.5 py-2 text-[15px] font-medium transition-colors",
        light ? (current === l.href ? "text-wh-terra" : "text-wh-text/80 hover:text-wh-forest") : current === l.href ? "text-wh-saffron" : "text-wh-cream/85 hover:text-white",
      )}
    >
      {l.label}
      {current === l.href && <span aria-hidden className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45 bg-current" />}
    </a>
  );

  return (
    <header className="sticky top-0 z-40">
      <div className={cn("relative z-50 transition-all duration-300", light ? "bg-wh-cream/95 shadow-wh backdrop-blur-md" : "bg-transparent")}>
        <div className="mx-auto grid h-[76px] max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
            {links.slice(0, half).map(link)}
          </nav>
          <span className="lg:hidden" />

          {/* Phones: the hero already shows the name, so the bar shows it only once it turns cream. */}
          <a
            href="#top"
            onClick={() => setOpen(false)}
            className={cn("min-w-0 text-center leading-tight transition-[opacity,visibility] duration-300", !light && "max-md:invisible max-md:opacity-0")}
          >
            <span className={cn("block truncate font-display text-xl font-semibold transition-colors sm:text-[22px]", light ? "text-wh-forest" : "text-wh-cream")}>{name}</span>
            {tagline && (
              <span
                className={cn(
                  "mt-0.5 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors",
                  light ? "text-wh-terra" : "text-wh-saffron",
                )}
              >
                <span aria-hidden className="h-px w-5 bg-current opacity-60" />
                {tagline}
                <span aria-hidden className="h-px w-5 bg-current opacity-60" />
              </span>
            )}
          </a>

          <div className="flex items-center justify-end gap-1">
            <nav aria-label="More sections" className="hidden items-center gap-1 lg:flex">
              {links.slice(half).map(link)}
            </nav>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="wh-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition lg:hidden",
                light ? "text-wh-forest hover:bg-wh-paper" : "text-wh-cream hover:bg-white/10",
              )}
            >
              {open ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
            </button>
          </div>
        </div>
        <span
          aria-hidden
          className={cn("absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-wh-saffron to-transparent transition-opacity", light ? "opacity-100" : "opacity-0")}
        />
      </div>

      <div
        id="wh-menu"
        className={cn(
          "wh-paper fixed inset-x-0 top-0 z-40 max-h-dvh overflow-y-auto px-6 pb-8 pt-24 shadow-wh-lg transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] lg:hidden",
          open ? "translate-y-0" : "pointer-events-none invisible -translate-y-full",
        )}
      >
        <ul className="divide-y divide-wh-line border-y border-wh-line">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="flex min-h-14 items-center justify-center font-display text-xl text-wh-forest">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {phone && (
            <a href={`tel:+${phone}`} className="flex min-h-12 items-center justify-center gap-2 rounded-full font-semibold text-wh-forest ring-1 ring-wh-line">
              <Phone aria-hidden className="size-4" /> Call
            </a>
          )}
          <a
            href="#appointment"
            onClick={() => setOpen(false)}
            className={cn("flex min-h-12 items-center justify-center gap-2 rounded-full bg-wh-terra font-semibold text-white", !phone && "col-span-2")}
          >
            <CalendarHeart aria-hidden className="size-4" /> Book
          </a>
        </div>
      </div>
    </header>
  );
}

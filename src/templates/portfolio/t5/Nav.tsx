"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, HeartPulse, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Specialist Pro header: a white bar with a crimson heartbeat mark, and on
 * extra-large screens a fixed rail of section dots on the left that shows
 * where you are on the page. Phones get a sheet that slides in from the right.
 */
export function Nav({ name, tagline, links }: { name: string; tagline?: string; links: NavLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const y = window.scrollY + 180;
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
    <>
      <header className={cn("sticky top-0 z-40 border-b bg-white/95 backdrop-blur-xl transition-shadow", scrolled ? "border-sp-line shadow-sp" : "border-transparent")}>
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sp-crimson text-white">
              <HeartPulse className="sp-beat size-5" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[17px] font-bold tracking-tight text-sp-slate">{name}</span>
              {tagline && <span className="block truncate text-xs font-semibold text-sp-cyan">{tagline}</span>}
            </span>
          </a>
          <nav aria-label="Sections" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-sp-ice p-1">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={current === l.href ? "true" : undefined}
                    className={cn(
                      "block rounded-full px-4 py-2 text-sm font-semibold transition",
                      current === l.href ? "bg-white text-sp-crimson shadow-sp" : "text-sp-muted hover:text-sp-slate",
                    )}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            <a
              href="#appointment"
              className="hidden items-center gap-2 rounded-xl bg-sp-crimson px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sp-crimson-2 sm:inline-flex"
            >
              <CalendarCheck aria-hidden className="size-4" /> Book
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="sp-menu"
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-xl text-sp-slate ring-1 ring-sp-line lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Section rail (extra-large screens) */}
      <nav aria-label="Page sections" className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 2xl:block">
        <ul className="space-y-3">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group flex items-center gap-3" aria-label={l.label}>
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    current === l.href ? "w-8 bg-sp-crimson" : "w-2 bg-sp-slate/25 group-hover:w-5 group-hover:bg-sp-slate/50",
                  )}
                />
                <span
                  className={cn("text-xs font-semibold transition-opacity", current === l.href ? "text-sp-crimson opacity-100" : "text-sp-muted opacity-0 group-hover:opacity-100")}
                >
                  {l.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Phone sheet */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-sp-slate/50 transition-opacity", open ? "opacity-100" : "opacity-0")}
        />
        <div
          id="sp-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col bg-white p-5 shadow-sp-lg transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-sp-muted">Menu</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-xl ring-1 ring-sp-line">
              <X className="size-5" />
            </button>
          </div>
          <ul className="mt-6 space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn("flex min-h-12 items-center rounded-xl px-3 font-semibold", current === l.href ? "bg-sp-blush text-sp-crimson" : "text-sp-slate hover:bg-sp-ice")}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#appointment"
            onClick={() => setOpen(false)}
            className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sp-crimson font-semibold text-white"
          >
            <CalendarCheck aria-hidden className="size-5" /> Book appointment
          </a>
        </div>
      </div>
    </>
  );
}

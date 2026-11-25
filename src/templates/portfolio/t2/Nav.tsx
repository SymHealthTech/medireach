"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Clinic Modern header: transparent over the hero photo, then a white bar with
 * a shadow once the page scrolls. Highlights the section in view, and opens a
 * full-width menu on phones.
 */
export function Nav({
  name,
  tagline,
  links,
}: {
  name: string;
  tagline?: string;
  links: NavLink[];
}) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 40);
      const y = window.scrollY + 140;
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
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const light = solid || open;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        light ? "bg-white/95 shadow-[0_8px_30px_-12px_rgb(11_37_69/0.25)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <a href="#top" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="min-w-0 leading-tight">
            <span className={cn("block truncate text-base font-extrabold tracking-tight transition-colors sm:text-lg", light ? "text-cm-navy" : "text-white")}>{name}</span>
            {tagline && <span className={cn("block truncate text-xs font-medium transition-colors", light ? "text-cm-teal" : "text-white/75")}>{tagline}</span>}
          </span>
        </a>

        <nav aria-label="Sections" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={current === l.href ? "true" : undefined}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    light ? "text-cm-text/80 hover:text-cm-navy" : "text-white/85 hover:text-white",
                    current === l.href && (light ? "text-cm-teal" : "text-white"),
                  )}
                >
                  {l.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-cm-teal transition-transform duration-300",
                      current === l.href ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <a
            href="#appointment"
            className="hidden items-center gap-2 rounded-xl bg-cm-teal px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgb(13_148_136/0.8)] transition hover:-translate-y-0.5 hover:bg-cm-teal-2 sm:inline-flex"
          >
            <CalendarCheck aria-hidden className="size-4" strokeWidth={2} />
            Book appointment
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="cm-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cn("flex size-11 items-center justify-center rounded-xl transition lg:hidden", light ? "text-cm-navy hover:bg-cm-sky" : "text-white hover:bg-white/10")}
          >
            {open ? <X className="size-6" strokeWidth={2} /> : <Menu className="size-6" strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div
        id="cm-menu"
        hidden={!open}
        className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-cm-line bg-white px-4 pb-6 pt-2 lg:hidden"
      >
        <ul className="divide-y divide-cm-line">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center text-base font-semibold text-cm-navy">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#appointment"
          onClick={() => setOpen(false)}
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cm-teal font-semibold text-white"
        >
          <CalendarCheck aria-hidden className="size-5" strokeWidth={2} />
          Book appointment
        </a>
      </div>
    </header>
  );
}

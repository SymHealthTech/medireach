"use client";

import { useEffect, useState } from "react";
import { CalendarHeart, Clock, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Serene Care header: a slim plum ribbon (hours and phone) above a frosted
 * white bar. The ribbon folds away once the page scrolls; the section in view
 * gets a rose underline; phones get a drawer that slides in from the right.
 */
export function Nav({
  name,
  monogram,
  tagline,
  links,
  hours,
  phone,
  phoneLabel,
}: {
  name: string;
  monogram: string;
  tagline?: string;
  links: NavLink[];
  hours?: string;
  phone?: string;
  phoneLabel?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
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
      {(hours || phone) && (
        <div className={cn("hidden overflow-hidden bg-sc-plum text-[13px] text-white/85 transition-all duration-500 md:block", scrolled ? "max-h-0" : "max-h-10")}>
          <div className="mx-auto flex h-10 max-w-[1200px] items-center justify-between gap-6 px-6">
            {hours ? (
              <p className="flex min-w-0 items-center gap-2 truncate">
                <Clock aria-hidden className="size-3.5 shrink-0 text-sc-pink" strokeWidth={2} />
                {hours}
              </p>
            ) : (
              <span />
            )}
            {phone && (
              <a href={`tel:+${phone}`} className="flex shrink-0 items-center gap-2 font-semibold text-white hover:text-sc-pink">
                <Phone aria-hidden className="size-3.5 text-sc-pink" strokeWidth={2} />
                {phoneLabel}
              </a>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "border-b transition-all duration-300",
          scrolled ? "border-sc-line bg-white/90 shadow-sc backdrop-blur-xl" : "border-transparent bg-white/70 backdrop-blur-md",
        )}
      >
        <div className={cn("mx-auto flex max-w-[1200px] items-center gap-4 px-4 transition-all duration-300 sm:px-6", scrolled ? "h-[66px]" : "h-[78px]")}>
          <a href="#top" className="group flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <span
              aria-hidden
              className="relative flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold text-sc-plum ring-1 ring-sc-gold/60"
            >
              <span className="absolute inset-1 rounded-full bg-sc-blush transition group-hover:bg-sc-pink/40" />
              <span className="relative">{monogram}</span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[19px] font-semibold text-sc-plum">{name}</span>
              {tagline && <span className="block truncate text-xs font-medium uppercase tracking-[0.18em] text-sc-rose">{tagline}</span>}
            </span>
          </a>

          <nav aria-label="Sections" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={current === l.href ? "true" : undefined}
                    className={cn(
                      "group relative block px-3 py-2 text-[15px] font-medium transition-colors",
                      current === l.href ? "text-sc-rose" : "text-sc-text/80 hover:text-sc-plum",
                    )}
                  >
                    {l.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute bottom-0.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-sc-rose transition-transform duration-300",
                        current === l.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            <a
              href="#appointment"
              className="hidden items-center gap-2 rounded-full bg-sc-rose px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_-12px_rgb(185_68_111/0.9)] transition hover:-translate-y-0.5 hover:bg-sc-rose-2 sm:inline-flex"
            >
              <CalendarHeart aria-hidden className="size-4" strokeWidth={2} />
              Book a visit
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="sc-menu"
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-full text-sc-plum ring-1 ring-sc-line transition hover:bg-sc-blush lg:hidden"
            >
              <Menu className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-sc-plum/40 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          id="sc-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-sc-cream px-6 pb-8 pt-5 shadow-sc-lg transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-semibold text-sc-plum">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-full text-sc-plum ring-1 ring-sc-line"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </div>
          <ul className="mt-6 space-y-1">
            {links.map((l, i) => (
              <li
                key={l.href}
                className={cn("transition-all duration-500", open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0")}
                style={{ transitionDelay: open ? `${120 + i * 50}ms` : "0ms" }}
              >
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-between rounded-2xl px-3 font-display text-xl text-sc-plum hover:bg-sc-blush"
                >
                  {l.label}
                  <span aria-hidden className="text-sm text-sc-rose">
                    0{i + 1}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-3">
            {phone && (
              <a href={`tel:+${phone}`} className="flex min-h-12 items-center justify-center gap-2 rounded-full font-semibold text-sc-plum ring-1 ring-sc-line">
                <Phone aria-hidden className="size-4" /> {phoneLabel}
              </a>
            )}
            <a href="#appointment" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-sc-rose font-semibold text-white">
              <CalendarHeart aria-hidden className="size-5" strokeWidth={2} /> Book a visit
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

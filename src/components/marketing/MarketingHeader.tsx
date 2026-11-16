"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { NAV } from "@/content/marketing";
import { cn } from "@/lib/cn";
import { CallbackButton } from "./CallbackButton";

/**
 * Sticky top bar (DESIGN_BRIEF.md §3.1): wordmark, links, "Call me back".
 * Transparent at the top, solid once you scroll. Mobile: logo + menu, with
 * the call-back button inside the menu.
 */
export function MarketingHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200",
        solid || open ? "border-b border-line bg-paper/95 shadow-[0_1px_2px_rgba(14,59,60,.06)] backdrop-blur" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MediReach home" className="mr-auto">
          <LogoWordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-body md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <CallbackButton
          label="Call me back"
          className="hidden h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-700 active:scale-[.98] md:inline-flex"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-[10px] text-ink md:hidden"
        >
          {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-paper px-4 pb-4 md:hidden">
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex h-12 items-center border-b border-line text-base font-medium text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <CallbackButton className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]" />
        </nav>
      )}
    </header>
  );
}


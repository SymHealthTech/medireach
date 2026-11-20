"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { NAV } from "@/content/marketing";
import { cn } from "@/lib/cn";
import { GetStartedButton } from "@/components/intake/GetStartedButton";

/**
 * Sticky top bar (DESIGN_BRIEF.md §4.1): wordmark, links, "Get started"
 * (opens the call-back dialog). Transparent at the top, solid paper with a
 * hairline once you scroll. Mobile: logo + "Get started" + menu.
 */
export function MarketingHeader({ waHref }: { waHref: string }) {
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
        solid || open ? "border-b border-line bg-paper/95 shadow-[0_1px_2px_rgba(10,63,63,.06)] backdrop-blur" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MediReach home" className="mr-auto">
          <LogoWordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-body lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <GetStartedButton
          waHref={waHref}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-marigold px-4 text-sm font-semibold text-white hover:bg-marigold-700 active:scale-[.98]"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-[10px] text-ink lg:hidden"
        >
          {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-paper px-4 pb-4 lg:hidden">
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex h-12 items-center border-b border-line text-base font-medium text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { InstallAppButton } from "@/components/site/InstallAppButton";
import { whatsappLink } from "@/lib/marketing";

/**
 * Public site header (spec §4.1): logo + minimal nav (How it works / Pricing /
 * Login / Sign up) and an always-visible WhatsApp button. On small screens the
 * links collapse behind a hamburger menu so the bar never overflows.
 */
const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign up" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" onClick={() => setOpen(false)}>
          <LogoWordmark />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          {NAV_LINKS.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink-muted hover:text-ink">
              {n.label}
            </Link>
          ))}
          <ThemeToggle />
          <InstallAppButton />
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener"
            className="rounded-xl bg-[#25D366] px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            WhatsApp us
          </a>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink hover:bg-line/40"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <nav className="border-t border-line bg-surface lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-5 py-2">
            {NAV_LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3.5 font-medium text-ink last:border-0"
              >
                {n.label}
              </Link>
            ))}
            <div className="my-3">
              <InstallAppButton className="w-full justify-center py-3" onAction={() => setOpen(false)} />
            </div>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener"
              onClick={() => setOpen(false)}
              className="mb-3 rounded-xl bg-[#25D366] px-4 py-3 text-center font-semibold text-white hover:opacity-90"
            >
              WhatsApp us
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

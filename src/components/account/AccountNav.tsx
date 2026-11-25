"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ExternalLink, IdCard, LayoutDashboard, Newspaper, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/inquiries", label: "Appointment requests", short: "Requests", icon: CalendarCheck, badge: true },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/blog", label: "Health articles", short: "Articles", icon: Newspaper },
  { href: "/account/card", label: "Visiting card", short: "Card", icon: IdCard },
] as const;

/**
 * Doctor account navigation: a sidebar on large screens, a scrollable tab row
 * on phones. `newCount` badges the appointment requests.
 */
export function AccountNav({ newCount, pageUrl }: { newCount: number; pageUrl?: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href));

  return (
    <>
      {/* Phones and tablets: tab row */}
      <nav aria-label="Account" className="-mx-4 overflow-x-auto border-b border-line px-4 lg:hidden">
        <ul className="flex min-w-max gap-1">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active(it.href) ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-2 px-3 text-sm font-semibold transition",
                  active(it.href) ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-lagoon" : "text-muted-foreground hover:text-ink",
                )}
              >
                <it.icon aria-hidden className="size-4" strokeWidth={1.9} />
                {"short" in it ? it.short : it.label}
                {"badge" in it && newCount > 0 && <span className="rounded-full bg-marigold px-1.5 text-xs font-bold text-white">{newCount}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Large screens: sidebar */}
      <nav aria-label="Account" className="sticky top-24 hidden self-start lg:block">
        <ul className="space-y-1">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active(it.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition",
                  active(it.href) ? "bg-surface text-ink shadow-soft ring-1 ring-line" : "text-body/75 hover:bg-surface/70 hover:text-ink",
                )}
              >
                <span className={cn("flex size-8 items-center justify-center rounded-lg", active(it.href) ? "bg-lagoon text-white" : "bg-mist text-lagoon")}>
                  <it.icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <span className="flex-1">{it.label}</span>
                {"badge" in it && newCount > 0 && <span className="rounded-full bg-marigold px-2 py-0.5 text-xs font-bold text-white">{newCount}</span>}
              </Link>
            </li>
          ))}
        </ul>
        {pageUrl && (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener"
            className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-sm font-semibold text-lagoon hover:border-lagoon/50"
          >
            <ExternalLink aria-hidden className="size-4" /> View my website
          </a>
        )}
      </nav>
    </>
  );
}

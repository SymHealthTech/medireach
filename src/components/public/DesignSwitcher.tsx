"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Palette } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TemplateKey } from "@/lib/constants";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";

/**
 * Floating pill on sample pages: one tap switches the design (?design=…).
 * Always fixed to the screen: bottom centre on phones (above the sticky
 * contact bar), bottom right on larger screens. Rendered into <body> through
 * a portal, so no transformed or blurred ancestor can turn "fixed" into
 * "scrolls with the page".
 */
export function DesignSwitcher({ basePath, current }: { basePath: string; current: TemplateKey }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<Switcher basePath={basePath} current={current} />, document.body);
}

function Switcher({ basePath, current }: { basePath: string; current: TemplateKey }) {
  const active = SAMPLE_DESIGNS.find((d) => d.key === current) ?? SAMPLE_DESIGNS[0]!;
  return (
    <nav
      aria-label="Sample designs"
      className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink-900/95 py-1.5 pl-3 pr-1.5 text-paper shadow-lift ring-2 ring-marigold/60 backdrop-blur sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <Palette aria-hidden className="size-4 shrink-0 text-marigold" strokeWidth={1.75} />
      <span className="mr-1 whitespace-nowrap text-xs font-semibold sm:text-sm">
        <span className="hidden sm:inline">Design: </span>
        {active.name}
      </span>
      <ul className="flex items-center gap-1">
        {SAMPLE_DESIGNS.map((d, i) => {
          const isActive = d.key === active.key;
          const label = `${i + 1}`;
          const cls = cn(
            "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition",
            isActive ? "bg-marigold text-white" : d.ready ? "bg-paper/10 hover:bg-paper/20" : "cursor-not-allowed text-paper/35",
          );
          return (
            <li key={d.key}>
              {d.ready ? (
                <Link
                  href={d.key === "classic" ? basePath : `${basePath}?design=${d.key}`}
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Design ${label}: ${d.name}`}
                  title={d.name}
                  className={cls}
                >
                  {label}
                </Link>
              ) : (
                <span aria-label={`Design ${label}: ${d.name} (coming soon)`} title={`${d.name} — coming soon`} className={cls}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

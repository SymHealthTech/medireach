import Link from "next/link";
import { Palette } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TemplateKey } from "@/lib/constants";

/** The five portfolio designs shown on sample pages. Flip `ready` as each one is built. */
export const SAMPLE_DESIGNS: { key: TemplateKey; name: string; ready: boolean }[] = [
  { key: "classic", name: "Classic", ready: true },
  { key: "t2", name: "Clinic Modern", ready: false },
  { key: "t3", name: "Minimal Mono", ready: false },
  { key: "t4", name: "Warm Heritage", ready: false },
  { key: "t5", name: "Specialist Pro", ready: false },
];

/**
 * Floating pill on sample pages: one tap switches the design (?design=…).
 * Sits above the mobile sticky contact bar.
 */
export function DesignSwitcher({ basePath, current }: { basePath: string; current: TemplateKey }) {
  const active = SAMPLE_DESIGNS.find((d) => d.key === current) ?? SAMPLE_DESIGNS[0]!;
  return (
    <nav
      aria-label="Sample designs"
      className="fixed bottom-[88px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink-900/95 py-1.5 pl-3 pr-1.5 text-paper shadow-lift ring-1 ring-paper/10 backdrop-blur sm:bottom-6"
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
            isActive ? "bg-marigold text-ink" : d.ready ? "bg-paper/10 hover:bg-paper/20" : "cursor-not-allowed text-paper/35",
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

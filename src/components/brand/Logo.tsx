import { cn } from "@/lib/cn";

/**
 * MediReach wordmark (DESIGN_BRIEF.md §3.1): "MediReach" in Fraunces with a
 * small marigold dot. `tone="light"` is for ink backgrounds (footer, sidebar).
 */
export function LogoWordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display text-[22px] font-semibold leading-none tracking-tight",
        tone === "ink" ? "text-ink" : "text-paper",
        className,
      )}
    >
      MediReach
      <span aria-hidden className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-marigold" />
    </span>
  );
}

/** Square mark for small spaces: "M" on ink with the marigold dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-label="MediReach"
      role="img"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink font-display text-lg font-semibold text-paper",
        className,
      )}
    >
      M
      <span aria-hidden className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-marigold" />
    </span>
  );
}

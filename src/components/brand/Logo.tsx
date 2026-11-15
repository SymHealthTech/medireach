import { cn } from "@/lib/cn";

/**
 * MediReach wordmark (DESIGN_BRIEF.md §3.1): "MediReach" in Fraunces with a
 * small marigold dot. `tone="light"` is for ink backgrounds (public footer,
 * dashboard sidebar) and stays light in dark mode too.
 */
export function LogoWordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display text-[22px] font-semibold leading-none tracking-tight",
        tone === "ink" ? "text-ink" : "text-[#fbf8f3]",
        className,
      )}
    >
      MediReach
      <span aria-hidden className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-marigold" />
    </span>
  );
}

/** Square mark for small spaces — the same bold "M" + dot as the site icon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="MediReach" className={cn("size-9 shrink-0", className)}>
      <rect width="100" height="100" rx="22" fill="#0E3B3C" />
      <path d="M20 76V24h14l16 24 16-24h14v52H67V47L50 71 33 47v29z" fill="#FBF8F3" />
      <circle cx="83" cy="83" r="8" fill="#E3A23B" />
    </svg>
  );
}

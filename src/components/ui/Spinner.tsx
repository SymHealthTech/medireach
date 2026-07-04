import { cn } from "@/lib/cn";

/**
 * Teal loading spinner (build-prompt: "subtle teal-coloured spinner, not a
 * generic grey one"). The ring styling lives in `.spinner` (globals.css) so the
 * head/track colours follow the brand teal in both light and dark mode.
 *
 * Sizes map to border thickness so small spinners stay crisp.
 */
const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[2.5px]",
  lg: "h-9 w-9 border-[3px]",
} as const;

export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof sizes;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("spinner", sizes[size], className)}
    />
  );
}

/** Centered spinner for full-panel / page loading states. */
export function SpinnerBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      {label && <p className="text-sm text-ink-muted">{label}</p>}
    </div>
  );
}

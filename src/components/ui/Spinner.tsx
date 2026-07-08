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

/** Centered spinner for in-panel / modal loading states (fixed vertical padding). */
export function SpinnerBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      {label && <p className="text-sm text-ink-muted">{label}</p>}
    </div>
  );
}

/**
 * Canonical page/route loader: fills its container and centers the spinner on
 * BOTH axes (build-prompt Phase 1: "horizontally AND vertically centered").
 * Use this for full-page data loads and as the `loading.tsx` route fallback.
 */
export function PageLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Spinner size="lg" />
      {label && <p className="text-sm text-ink-muted">{label}</p>}
    </div>
  );
}

/**
 * Full-screen centered overlay for auth/route transitions where the whole
 * viewport should read as "loading" — notably the login → app hand-off, which
 * otherwise looks frozen while the app shell is fetched.
 */
export function ScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-surface"
    >
      <Spinner size="lg" />
      {label && <p className="text-sm text-ink-muted">{label}</p>}
    </div>
  );
}

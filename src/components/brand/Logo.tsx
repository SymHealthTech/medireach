import { cn } from "@/lib/cn";

/** The site icon as a PNG (same badge as LogoBadge), served from public/. For <img> in mockups and emails. */
export const BRAND_ICON_SRC = "/icon-192.png";

/** Brand colours, shared with the MediReach clinic app. */
const TEAL = "#0E7C7B";
const AMBER = "#F2994A";

/**
 * MediReach badge (same artwork as the clinic app): a rounded teal square
 * holding a white speech bubble with a teal pulse line and an amber dot at
 * the tail tip. Inline SVG so it stays crisp at any size.
 */
export function LogoBadge({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={cn("size-10 shrink-0", className)}>
      <rect width="48" height="48" rx="12" fill={TEAL} />
      <path d="M12 12h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-7 6v-6h-3a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" fill="#FFFFFF" />
      <path d="M14 23h5l3-6 4 12 3-6h5" fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="38" r="2.6" fill={AMBER} />
    </svg>
  );
}

/**
 * MediReach logo: the badge and the two-tone wordmark ("Medi" teal,
 * "Reach" amber), as in the clinic app. `tone="light"` is for dark panels
 * (footer, dashboard sidebar): "Medi" turns white. The badge scales with the
 * text size (1.3em).
 */
export function LogoWordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[22px] font-bold leading-none tracking-tight", className)}>
      <LogoBadge className="size-[1.3em]" />
      <span>
        <span style={{ color: tone === "ink" ? TEAL : "#FFFFFF" }}>Medi</span>
        <span style={{ color: AMBER }}>Reach</span>
      </span>
    </span>
  );
}

/** Square mark for small spaces: the badge on its own. */
export function LogoMark({ className }: { className?: string }) {
  return <LogoBadge title="MediReach" className={cn("size-9", className)} />;
}

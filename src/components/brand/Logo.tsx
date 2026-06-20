import { cn } from "@/lib/cn";

/**
 * MediReach logo (spec §2 / build-prompt): a rounded teal square badge holding
 * a white speech-bubble shape with a teal pulse line through it and a small
 * amber dot at the tail tip — voice + medical + "active". Built as a real,
 * reusable SVG (not an image file) so it scales crisply and recolors with the
 * theme. The same `<LogoBadge />` is reused standalone as the app icon/favicon.
 */

export function LogoBadge({ className, title = "MediReach" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={cn("h-10 w-10", className)}
    >
      {/* rounded teal square badge */}
      <rect x="0" y="0" width="48" height="48" rx="12" className="fill-brand" />
      {/* white speech bubble with a tail at the bottom-left */}
      <path
        d="M12 12h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-7 6v-6h-3a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z"
        fill="#FFFFFF"
      />
      {/* teal pulse line through the bubble */}
      <path
        d="M14 23h5l3-6 4 12 3-6h5"
        fill="none"
        className="stroke-brand"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* amber dot at the tail tip */}
      <circle cx="15" cy="38" r="2.6" className="fill-action" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold", className)}>
      <LogoBadge className="h-8 w-8" />
      <span className="text-xl tracking-tight">
        <span className="text-brand">Medi</span>
        <span className="text-action">Reach</span>
      </span>
    </span>
  );
}

import { cn } from "@/lib/cn";

/**
 * MediReach loader: the logo badge with its pulse line redrawing like a
 * heart monitor, and two soft rings (teal, amber) breathing out from it.
 * CSS-only (globals.css: mr-pulse-draw, mr-ring, mr-dot), so it works in
 * server components and loading.tsx files before any JavaScript runs.
 */
export function BrandLoader({ label = "Loading", className, size = "md" }: { label?: string; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <span className={cn("relative flex items-center justify-center", size === "sm" ? "size-12" : "size-16")}>
        <span aria-hidden className="mr-ring absolute inset-0 rounded-[28%] bg-lagoon/30" />
        <span aria-hidden className="mr-ring mr-ring-late absolute inset-0 rounded-[28%] bg-marigold/25" />
        <svg viewBox="0 0 48 48" aria-hidden className="relative size-full drop-shadow-[0_6px_14px_rgb(14_124_123/0.35)]">
          <rect width="48" height="48" rx="12" fill="#0E7C7B" />
          <path d="M12 12h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-7 6v-6h-3a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" fill="#FFFFFF" />
          <path d="M14 23h5l3-6 4 12 3-6h5" fill="none" stroke="#0E7C7B" strokeOpacity="0.15" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path className="mr-pulse-draw" d="M14 23h5l3-6 4 12 3-6h5" fill="none" stroke="#0E7C7B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="15" cy="38" r="2.6" fill="#F2994A" />
        </svg>
      </span>
      <span className={cn("inline-flex items-baseline font-semibold text-ink", size === "sm" ? "text-sm" : "text-base")}>
        {label}
        <span aria-hidden className="ml-0.5 inline-flex gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="mr-dot inline-block size-1 rounded-full bg-marigold" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </span>
      </span>
    </div>
  );
}

/** Full-area loader for loading.tsx files: centred on a soft wash. */
export function PageLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div aria-busy="true" className={cn("mr-fade-in flex min-h-[70dvh] items-center justify-center px-4", className)}>
      <BrandLoader label={label} />
    </div>
  );
}

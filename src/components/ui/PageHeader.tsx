import { cn } from "@/lib/cn";

/**
 * Standard page header (Phase 3 consistency pass). Before this, only the queue
 * and records pages had the teal accent bar + title/subtitle; every other page
 * used a bare 20px heading. This centralizes the pattern so every screen opens
 * the same way, at the spec's page-title scale (24px / 700).
 *
 *   title     — the page name (24px/700)
 *   subtitle  — optional 14px muted helper line
 *   actions   — optional right-aligned controls (e.g. an "+ Add" button)
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 border-l-4 border-brand pl-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
